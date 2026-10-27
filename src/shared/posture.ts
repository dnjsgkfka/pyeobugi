import type { Baseline } from './calibration'
import type { SEVERITIES } from './schemas/events'

export type Severity = (typeof SEVERITIES)[number]

/**
 * 자세 판정 파라미터. 전부 밖으로 빼 두어 민감도 프리셋이나 설정으로 바꿀 수 있다.
 * 기준은 온보딩에서 잡은 개인 기준값(baseline)이고, 모든 비교는 그 대비 상대값이다.
 */
export interface PostureThresholds {
  /** 기준보다 이만큼(도) 더 숙이면 나쁜 자세로 본다 */
  pitchDeltaDeg: number
  /** 기준보다 얼굴이 이 배율 이상 커지면(가까워지면) 나쁜 자세로 본다 */
  sizeRatio: number
  /** 이 시간(ms) 동안 이어져야 나쁜 자세로 확정한다 */
  holdMs: number
  /** 이 시간(ms) 동안 바른 자세여야 복귀로 본다 */
  recoverMs: number
  /**
   * 복귀 기준. 진입은 1.0(기준 초과)이지만, 복귀는 이만큼 아래로 내려와야 인정한다.
   * 기준선 근처에서 상태가 깜빡이는 것을 막는다 (AI 팀 README 의 "진입과 회복 기준을 다르게").
   */
  exitScore: number
  /** 기준 초과량이 이 배수를 넘으면 MODERATE / SEVERE */
  moderateFactor: number
  severeFactor: number
}

/** 교정 강도 0 느슨하게 / 1 보통 / 2 엄격하게 (설정의 슬라이더 3단계) */
export type Sensitivity = 0 | 1 | 2

/**
 * 민감도 프리셋.
 * TODO(AI 팀 합의): 아래 값은 FE 임시값이다. 합의된 값으로 바꾸고 docs/posture-thresholds.md 를 갱신한다.
 */
export const PRESETS: Record<Sensitivity, PostureThresholds> = {
  0: {
    pitchDeltaDeg: 15,
    sizeRatio: 1.2,
    holdMs: 3_000,
    recoverMs: 2_000,
    exitScore: 0.8,
    moderateFactor: 1.6,
    severeFactor: 2.2
  },
  1: {
    pitchDeltaDeg: 10,
    sizeRatio: 1.14,
    holdMs: 3_000,
    recoverMs: 2_000,
    exitScore: 0.8,
    moderateFactor: 1.6,
    severeFactor: 2.2
  },
  2: {
    pitchDeltaDeg: 6,
    sizeRatio: 1.08,
    holdMs: 3_000,
    recoverMs: 2_000,
    exitScore: 0.8,
    moderateFactor: 1.6,
    severeFactor: 2.2
  }
}

export interface Deviation {
  /** 1 이면 딱 기준점, 1 을 넘으면 나쁜 자세 */
  score: number
  pitchOver: number
  sizeOver: number
}

/**
 * 기준 대비 얼마나 벗어났는지.
 * pitch(고개 숙임)와 size(화면에 가까워짐) 중 더 많이 벗어난 쪽을 쓴다.
 * 둘 다 거북목의 신호이고, 사람마다 드러나는 쪽이 다르다.
 */
export function deviationFrom(
  baseline: Baseline,
  pitch: number,
  size: number,
  thresholds: PostureThresholds
): Deviation {
  const pitchOver = (pitch - baseline.pitch) / thresholds.pitchDeltaDeg
  const sizeLimit = baseline.size * (thresholds.sizeRatio - 1)
  const sizeOver = sizeLimit > 0 ? (size - baseline.size) / sizeLimit : 0
  return { score: Math.max(pitchOver, sizeOver), pitchOver, sizeOver }
}

export function severityOf(score: number, thresholds: PostureThresholds): Severity {
  if (score >= thresholds.severeFactor) return 'SEVERE'
  if (score >= thresholds.moderateFactor) return 'MODERATE'
  return 'MILD'
}
