/**
 * AI 파트 레포(kayo2e/pyeobugi-AI)의 감지 코어를 그대로 가져온 파일.
 * 원본: src/shared/posture/feedback.ts (main, 2026-11-05 기준)
 *
 * 로직은 여기서 고치지 않는다. 고쳐야 하면 AI 레포에 반영한 뒤 다시 가져온다.
 * (형식만 우리 prettier 설정에 맞춰 두었다)
 */
import type { EngineState, ExitReason, Transition } from './engine'
import { severityOf } from './score'
import type { Severity } from './score'

export type FeedbackPhase =
  'UNCALIBRATED' | 'UNAVAILABLE' | 'GOOD' | 'PENDING_BAD' | 'BAD' | 'RECOVERING'

export type PostureFeedback = {
  phase: FeedbackPhase
  score: number | null
  severity: Severity | null
  badSince: number | null
  badDurationMs: number
  exitSequence: number
  lastExit: { id: number; reason: ExitReason; occurredAt: number; detectedAt: number } | null
}

export const initialFeedback: PostureFeedback = {
  phase: 'UNAVAILABLE',
  score: null,
  severity: null,
  badSince: null,
  badDurationMs: 0,
  exitSequence: 0,
  lastExit: null
}

export const updateFeedback = (
  previous: PostureFeedback,
  engine: EngineState,
  at: number,
  calibrated: boolean,
  transitions: Transition[]
): PostureFeedback => {
  let lastExit = previous.lastExit
  let exitSequence = previous.exitSequence
  for (const t of transitions) {
    if (t.type === 'BAD_EXIT') {
      lastExit = { id: ++exitSequence, reason: t.reason, occurredAt: t.at, detectedAt: at }
    }
  }
  // A single dropped frame keeps the last state; the engine's own loss timeout decides when feedback stops
  const available = engine.present && calibrated
  const phase: FeedbackPhase = !engine.present
    ? 'UNAVAILABLE'
    : !calibrated
      ? 'UNCALIBRATED'
      : engine.bad
        ? engine.pendingSince !== null
          ? 'RECOVERING'
          : 'BAD'
        : engine.pendingSince !== null
          ? 'PENDING_BAD'
          : 'GOOD'
  return {
    phase,
    score: available ? engine.score : null,
    severity: available && engine.bad ? severityOf(engine.score) : null,
    badSince: available && engine.bad ? engine.badSince : null,
    badDurationMs:
      available && engine.bad && engine.badSince !== null ? Math.max(0, at - engine.badSince) : 0,
    exitSequence,
    lastExit
  }
}
