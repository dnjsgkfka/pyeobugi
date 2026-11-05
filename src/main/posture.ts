import { ipcMain, type IpcMainEvent } from 'electron'
import type { DetectionUpdate } from '@shared/detector'
import { IPC, type PostureView } from '@shared/ipc'
import { UsageTracker } from '@shared/usage'
import { buildEvent } from './events'
import { setTrayState } from './tray'
import { getQueue } from './queue'
import { getWindow } from './windows'

const usage = new UsageTracker()

/** 얼굴이 안 보이기 시작한 시각. 트레이 표시용 자리비움 판단에 쓴다 */
let lostSince: number | null = null
/** 자리를 비운 것으로 보는 시간. UsageTracker 의 기본값과 맞춘다 */
const AWAY_MS = 30_000

/** 마지막으로 받은 판정 상태 (트레이·디버그용) */
let lastPhase: DetectionUpdate['feedback']['phase'] = 'UNAVAILABLE'

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

export function getPostureState(): string {
  return lastPhase
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

/** 판정 전이를 서버 이벤트로 바꾼다. 전이 시각은 이미 시작 시점으로 소급돼 있다. */
function enqueueTransitions(update: DetectionUpdate): void {
  const queue = getQueue()
  for (const transition of update.transitions) {
    if (transition.type !== 'BAD_ENTER') continue
    // occurredAt 은 판정 시각이 아니라 나쁜 자세가 시작된 시각 (AI/BE 인수인계 문서)
    queue.enqueue(
      buildEvent('POSTURE_BAD', { severity: transition.severity }, new Date(transition.at))
    )
  }
}

/**
 * detector 창이 보낸 판정 결과를 받는다.
 * 추론·판정은 detector 창(AI 파트 모듈)이 하고, main 은 이벤트 적재와 창 사이 중계만 한다.
 * pitch·size·키포인트는 서버로 보내지 않는다.
 */
export function registerPostureIpc(): void {
  ipcMain.on(IPC.POSTURE_UPDATE, (event: IpcMainEvent, raw: unknown) => {
    if (event.sender !== getWindow('detector')?.webContents) return
    const update = raw as DetectionUpdate
    if (!update?.feedback || !update.sample) return

    const { sample, feedback, distance } = update
    lastPhase = feedback.phase

    // 판정과 무관하게 원시 샘플은 app 창으로 넘긴다 (개발 화면에서 쓴다)
    getWindow('app')?.webContents.send(IPC.POSTURE_SAMPLE, sample)

    const now = Date.now()
    const away = isAway(now, sample.face)
    const bad = feedback.phase === 'BAD'
    setTrayState(away ? 'away' : bad ? 'bad' : 'good')

    enqueueTransitions(update)

    // 사용 시간 집계. occurredAt 은 구간이 끝난 시각이어야 한다.
    // 나쁜 자세 시간은 BAD 인 동안만 센다 — RECOVERING 은 전이가 시작 시점으로
    // 소급되므로 여기서 세면 중복이 된다.
    for (const segment of usage.update(now, { face: sample.face, bad })) {
      getQueue().enqueue(buildEvent('USAGE_SEGMENT', segment, new Date(segment.endedAt)))
    }

    const view: PostureView = { feedback, distance }
    getWindow('app')?.webContents.send(IPC.POSTURE_STATE, view)
    getWindow('overlay')?.webContents.send(IPC.POSTURE_STATE, view)
  })

  // app → detector: 기준 잡기 시작
  ipcMain.on(IPC.CALIBRATION_START, () => {
    getWindow('detector')?.webContents.send(IPC.CALIBRATION_START)
  })

  // detector → app: 기준 잡기 진행 상태
  ipcMain.on(IPC.CALIBRATION_STATE, (event: IpcMainEvent, phase: unknown) => {
    if (event.sender !== getWindow('detector')?.webContents) return
    getWindow('app')?.webContents.send(IPC.CALIBRATION_STATE, phase)
  })
}
