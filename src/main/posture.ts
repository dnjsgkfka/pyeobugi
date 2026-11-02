import { ipcMain, type IpcMainEvent } from 'electron'
import { PostureSampleSchema } from '@shared/detector'
import { IPC } from '@shared/ipc'
import { PostureEngine } from '@shared/posture-engine'
import { PRESETS } from '@shared/posture'
import { UsageTracker } from '@shared/usage'
import { buildEvent } from './events'
import { getSettings } from './onboarding'
import { setTrayState } from './tray'
import { getQueue } from './queue'
import { getWindow } from './windows'

let engine: PostureEngine | null = null
const usage = new UsageTracker()

/** 얼굴이 안 보이기 시작한 시각. 자리비움 판단에 쓴다 */
let lostSince: number | null = null
/** 자리를 비운 것으로 보는 시간. UsageTracker 의 기본값과 맞춘다 */
const AWAY_MS = 30_000

/**
 * 자리를 오래 비웠는가.
 * 카메라는 끄지 않는다. 판정과 사용 시간만 쉬고, 돌아오면 그대로 이어진다.
 */
function isAway(now: number, face: boolean): boolean {
  if (face) {
    lostSince = null
    return false
  }
  if (lostSince === null) lostSince = now
  return now - lostSince >= AWAY_MS
}

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
 * 감지를 멈추거나(일시정지) 앱을 끌 때, 그리고 리포트를 열기 직전에
 * 쌓이던 구간을 마감해 큐에 넣는다.
 * @returns 마감한 구간 수
 */
export function flushUsage(): number {
  const segments = usage.flush(Date.now())
  for (const segment of segments) {
    getQueue().enqueue(buildEvent('USAGE_SEGMENT', segment, new Date(segment.endedAt)))
  }
  return segments.length
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

    const away = isAway(Date.now(), parsed.data.face)

    const result = engine.push(parsed.data)
    setTrayState(away ? 'away' : result.state === 'bad' ? 'bad' : 'good')
    const queue = getQueue()
    if (result.enteredBad) {
      queue.enqueue(buildEvent('POSTURE_BAD', { severity: result.enteredBad }))
    }

    // 사용 시간 집계. occurredAt 은 구간이 끝난 시각이어야 한다.
    for (const segment of usage.update(Date.now(), {
      face: parsed.data.face,
      bad: result.state === 'bad'
    })) {
      queue.enqueue(buildEvent('USAGE_SEGMENT', segment, new Date(segment.endedAt)))
    }
    getWindow('app')?.webContents.send(IPC.POSTURE_STATE, result)
    getWindow('overlay')?.webContents.send(IPC.POSTURE_STATE, result)
  })
}
