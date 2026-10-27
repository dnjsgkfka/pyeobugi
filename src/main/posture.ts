import { ipcMain, type IpcMainEvent } from 'electron'
import { PostureSampleSchema } from '@shared/detector'
import { IPC } from '@shared/ipc'
import { PostureEngine } from '@shared/posture-engine'
import { PRESETS } from '@shared/posture'
import { buildEvent } from './events'
import { getSettings } from './onboarding'
import { getQueue } from './queue'
import { getWindow } from './windows'

let engine: PostureEngine | null = null

/** 설정(기준 자세, 민감도)을 읽어 엔진을 만든다. 기준이 없으면 판정하지 않는다. */
export function configurePosture(): void {
  const { baseline, sensitivity } = getSettings().value
  if (!baseline) {
    engine = null
    return
  }
  const thresholds = PRESETS[sensitivity]
  if (engine) engine.configure(baseline, thresholds)
  else engine = new PostureEngine(baseline, thresholds)
}

export function getPostureState(): string {
  return engine?.value ?? 'good'
}

/**
 * detector 가 보낸 샘플을 판정한다.
 * 나쁜 자세로 막 확정된 순간에만 POSTURE_BAD 를 한 번 쌓는다.
 * severity 외에는 아무것도 보내지 않는다 (pitch·size 는 기기에만 머문다).
 */
export function registerPostureIpc(): void {
  ipcMain.on(IPC.POSTURE_SAMPLE, (event: IpcMainEvent, raw: unknown) => {
    if (event.sender !== getWindow('detector')?.webContents) return
    const parsed = PostureSampleSchema.safeParse(raw)
    if (!parsed.success) return

    // 판정과 무관하게 원시 샘플은 app 창으로 넘긴다 (디버그 화면, 얼굴 찾기 단계에서 쓴다)
    getWindow('app')?.webContents.send(IPC.POSTURE_SAMPLE, parsed.data)

    // 기준 자세를 아직 안 잡았으면 판정할 수 없다
    if (!engine) configurePosture()
    if (!engine) return

    const result = engine.push(parsed.data)
    if (result.enteredBad) {
      getQueue().enqueue(buildEvent('POSTURE_BAD', { severity: result.enteredBad }))
    }
    getWindow('app')?.webContents.send(IPC.POSTURE_STATE, result)
    getWindow('overlay')?.webContents.send(IPC.POSTURE_STATE, result)
  })
}
