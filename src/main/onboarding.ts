import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import type { Baseline } from '@shared/calibration'
import { IPC } from '@shared/ipc'
import { applyOverlayVisibility } from './overlay'
import { applyStudyTimer } from './pomodoro'
import { SettingsSchema, type Settings } from '@shared/schemas/settings'
import { toKstIso } from '@shared/time'
import { buildEvent } from './events'
import { getQueue } from './queue'
import { SettingsStore } from './settings'

let store: SettingsStore | null = null

export function initSettings(): SettingsStore {
  store = new SettingsStore(join(app.getPath('userData'), 'settings.json'))
  // 앱을 켠 시점의 값은 '이미 보낸 것'으로 둔다 → 아무것도 안 바꿨는데 이벤트가 나가지 않는다
  sentFeatures = store.value.features
  return store
}

export function getSettings(): SettingsStore {
  if (!store) throw new Error('initSettings() must be called first')
  return store
}

const BaselineSchema = SettingsSchema.shape.baseline.unwrap().omit({ savedAt: true })

type Features = Settings['features']

/** 이벤트로 마지막에 보낸 기능 on/off. 바뀌었을 때만 다시 보내려고 들고 있다. */
let sentFeatures: Features | null = null
let featureTimer: ReturnType<typeof setTimeout> | null = null
/** 토글을 연달아 누르면 하나로 묶는다 */
const SETTINGS_DEBOUNCE_MS = 500

function sameFeatures(a: Features, b: Features): boolean {
  return (
    a.studyTimer === b.studyTimer &&
    a.stretch === b.stretch &&
    a.awayPause === b.awayPause &&
    a.overlay === b.overlay
  )
}

/**
 * 기능 on/off 가 바뀌었으면 SETTINGS_CHANGED 를 한 번 쌓는다.
 * - 보내는 값은 토글 4개뿐이다 (민감도·기준값 같은 개인 설정은 보내지 않는다)
 * - 0.5초 모아서 한 번만 보낸다
 */
function scheduleFeatureEvent(features: Features): void {
  if (featureTimer) clearTimeout(featureTimer)
  featureTimer = setTimeout(() => {
    featureTimer = null
    if (sentFeatures && sameFeatures(sentFeatures, features)) return
    sentFeatures = features
    getQueue().enqueue(buildEvent('SETTINGS_CHANGED', features))
  }, SETTINGS_DEBOUNCE_MS)
}

/** 설정이 바뀌면 열려 있는 모든 창에 알린다 (다른 창도 바로 따라간다). */
function broadcast(settings: Settings): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IPC.SETTINGS_UPDATED, settings)
  }
}

export function registerOnboardingIpc(): void {
  ipcMain.handle(IPC.SETTINGS_GET, () => getSettings().value)

  ipcMain.handle(IPC.SETTINGS_UPDATE, (_event, patch: unknown) => {
    const parsed = SettingsSchema.partial().safeParse(patch)
    if (!parsed.success) return getSettings().value
    const settings = getSettings().update(parsed.data as Partial<Settings>)
    broadcast(settings)
    scheduleFeatureEvent(settings.features)
    // 공부 타이머 토글: 켜면 바로 돌고, 끄면 멈춘다
    applyStudyTimer()
    // 오버레이 토글: 꺼져 있으면 거북이 창을 숨긴다 (타이머가 돌면 시간만 띄운다)
    applyOverlayVisibility()
    return settings
  })

  ipcMain.handle(IPC.CALIBRATION_SAVE, (_event, baseline: unknown, isRecalibration: unknown) => {
    const parsed = BaselineSchema.safeParse(baseline)
    if (!parsed.success) return getSettings().value

    const value: Baseline = parsed.data
    const settings = getSettings().update({
      onboarded: true,
      baseline: { ...value, savedAt: toKstIso(new Date()) }
    })
    broadcast(settings)
    // 기준값 자체는 보내지 않는다. 완료 사실만 기록한다.
    getQueue().enqueue(
      buildEvent('CALIBRATION_COMPLETED', { isRecalibration: isRecalibration === true })
    )
    return settings
  })
}
