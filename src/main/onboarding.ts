import { app, ipcMain } from 'electron'
import { join } from 'node:path'
import type { Baseline } from '@shared/calibration'
import { IPC } from '@shared/ipc'
import { SettingsSchema, type Settings } from '@shared/schemas/settings'
import { toKstIso } from '@shared/time'
import { buildEvent } from './events'
import { getQueue } from './queue'
import { configurePosture } from './posture'
import { SettingsStore } from './settings'

let store: SettingsStore | null = null

export function initSettings(): SettingsStore {
  store = new SettingsStore(join(app.getPath('userData'), 'settings.json'))
  return store
}

export function getSettings(): SettingsStore {
  if (!store) throw new Error('initSettings() must be called first')
  return store
}

const BaselineSchema = SettingsSchema.shape.baseline.unwrap().omit({ savedAt: true })

export function registerOnboardingIpc(): void {
  ipcMain.handle(IPC.SETTINGS_GET, () => getSettings().value)

  ipcMain.handle(IPC.SETTINGS_UPDATE, (_event, patch: unknown) => {
    const parsed = SettingsSchema.partial().safeParse(patch)
    if (!parsed.success) return getSettings().value
    const settings = getSettings().update(parsed.data as Partial<Settings>)
    configurePosture() // 민감도가 바뀌면 판정 기준도 바뀐다
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
    configurePosture() // 새 기준으로 판정을 다시 시작한다
    // 기준값 자체는 보내지 않는다. 완료 사실만 기록한다.
    getQueue().enqueue(
      buildEvent('CALIBRATION_COMPLETED', { isRecalibration: isRecalibration === true })
    )
    return settings
  })
}
