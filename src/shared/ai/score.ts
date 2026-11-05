/**
 * AI 파트 레포(kayo2e/pyeobugi-AI)의 감지 코어를 그대로 가져온 파일.
 * 원본: src/shared/posture/score.ts (main, 2026-11-05 기준)
 *
 * 로직은 여기서 고치지 않는다. 고쳐야 하면 AI 레포에 반영한 뒤 다시 가져온다.
 * (형식만 우리 prettier 설정에 맞춰 두었다)
 */
export type Baseline = { pitch: number; size: number }

export type Severity = 'MILD' | 'MODERATE' | 'SEVERE'

const PITCH_DEADZONE = 1.5
const PITCH_WEIGHT = 1.4
const SIZE_WEIGHT = 120
const SIZE_GATE_START = 6
const SIZE_GATE_SPAN = 5
const SCORE_DEADZONE = 4

export const BAD_ENTER_SCORE = 3
export const BAD_EXIT_SCORE = 2

const SEVERITY_RANK: Record<Severity, number> = { MILD: 0, MODERATE: 1, SEVERE: 2 }

export const postureScore = (pitch: number, size: number, baseline: Baseline): number => {
  const dPitch = pitch - baseline.pitch
  const pitchTerm = dPitch > PITCH_DEADZONE ? (dPitch - PITCH_DEADZONE) * PITCH_WEIGHT : 0
  // Face size also grows when simply leaning toward the screen, so it only counts once the head is pitched down
  const gate =
    dPitch > SIZE_GATE_START ? Math.min(1, (dPitch - SIZE_GATE_START) / SIZE_GATE_SPAN) : 0
  const sizeTerm = Math.max(0, (size - baseline.size) * SIZE_WEIGHT) * gate
  const total = pitchTerm + sizeTerm
  return total < SCORE_DEADZONE ? 0 : total - SCORE_DEADZONE
}

export const severityOf = (score: number): Severity =>
  score >= 18 ? 'SEVERE' : score >= 10 ? 'MODERATE' : 'MILD'

export const maxSeverity = (a: Severity | null, b: Severity): Severity =>
  a !== null && SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b
