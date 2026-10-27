import type { AppEvent, EventType } from './schemas/events'
import { floorToSecond, kstStartOfDay, toKstIso } from './time'

/** 테스트와 mock 에서 쓰는 유효한 이벤트 생성기 */
export const TEST_SESSION_ID = 'a9a9a9a9-0000-4000-8000-0000000000aa'

export function makeEvent(type: EventType, now: Date = new Date()): AppEvent {
  const end = floorToSecond(now)
  const base = {
    eventId: crypto.randomUUID(),
    sessionId: TEST_SESSION_ID,
    occurredAt: toKstIso(end)
  }
  switch (type) {
    case 'SESSION_START':
    case 'SESSION_END':
    case 'POMODORO_COMPLETED':
      return { ...base, type, payload: {} }
    case 'USAGE_SEGMENT': {
      const start = new Date(Math.max(end.getTime() - 60_000, kstStartOfDay(end).getTime()))
      const durationSec = Math.round((end.getTime() - start.getTime()) / 1000)
      return {
        ...base,
        type,
        payload: {
          startedAt: toKstIso(start),
          endedAt: toKstIso(end),
          durationSec,
          badDurationSec: Math.min(12, durationSec)
        }
      }
    }
    case 'POSTURE_BAD':
      return { ...base, type, payload: { severity: 'MODERATE' } }
    case 'CALIBRATION_COMPLETED':
      return { ...base, type, payload: { isRecalibration: false } }
    case 'BUBBLE_SHOWN':
      return { ...base, type, payload: { bubbleType: 'POSTURE' } }
    case 'SETTINGS_CHANGED':
      return {
        ...base,
        type,
        payload: { studyTimer: true, stretch: true, awayPause: false, overlay: true }
      }
  }
}
