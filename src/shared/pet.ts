import { TIMING } from './ai/engine'
import type { PostureFeedback } from './ai/feedback'
import type { Sensitivity } from './schemas/settings'

/** 거북이가 보여 줄 상태. 우선순위: 자리비움 > 나쁨 > 좋음 */
export type PetMood = 'away' | 'bad' | 'good'

export interface PetState {
  mood: PetMood
  /**
   * 목 길이. 0 = 평소, 1 = 원본 그림만큼.
   * 1 을 넘으면 화면 밖으로 나간 목이 옆 칸으로 감겨 올라온다 (겹겹이).
   */
  neck: number
}

/** 거북목일 때 이 시간마다 원본 그림 길이만큼 늘어난다 */
export const NECK_GROW_MS = 900
/** 너무 많이 감기지 않게 (화면 폭만큼 감기면 더 늘려도 티가 안 난다) */
export const NECK_MAX = 24

/**
 * 판정 상태를 거북이 표정으로 옮긴다.
 * - UNAVAILABLE(얼굴 없음)·UNCALIBRATED → 자리비움처럼 그냥 돌아다닌다
 * - PENDING_BAD 는 아직 아니다 (확정된 BAD 에서만 목이 늘어난다)
 * - RECOVERING 은 회복을 기다리는 중이라 목이 줄어들기 시작한다
 */
export function moodFrom(posture: PostureFeedback | null): PetMood {
  if (!posture || posture.phase === 'UNAVAILABLE' || posture.phase === 'UNCALIBRATED') return 'away'
  return posture.phase === 'BAD' ? 'bad' : 'good'
}

/**
 * 교정 강도별로, 거북목 후보가 된 뒤 목이 늘어나기 시작할 때까지 기다리는 시간.
 *
 * 엔진은 후보가 된 지 `enterAfterMs`(3초) 뒤에 나쁜 자세로 확정한다. 그 타이밍은
 * AI·BE 와 맞춘 값이라 건드리지 않고(이벤트는 그대로 3초), **화면 피드백만** 앞당긴다.
 * - 2 엄격하게: 즉시
 * - 1 보통: 절반(1.5초)
 * - 0 느슨하게: 확정과 같은 시점(3초) — 기존 동작
 */
export const NECK_START_DELAY_MS: Record<Sensitivity, number> = {
  0: TIMING.enterAfterMs,
  1: Math.round(TIMING.enterAfterMs / 2),
  2: 0
}

/**
 * 목 길이를 구한다. `candidateSince` 는 점수가 진입선을 넘은 시각이다.
 *
 * 추론은 1초에 한 번뿐이지만 이 값은 지금 시각으로 계산하므로 매 프레임 조금씩 늘어난다
 * (판정 결과가 올 때마다 맞추면 1초마다 한 칸씩 뛰어서 계단처럼 보인다).
 * 엔진의 `badSince` 를 쓰지 않는 이유: 확정 3초 전으로 소급된 값이라 그대로 쓰면
 * 확정되는 순간 세 칸쯤에서 시작해 목이 튀어나간다.
 */
export function neckFrom(
  candidateSince: number | null,
  sensitivity: Sensitivity,
  now: number
): number {
  if (candidateSince === null) return 0
  const startAt = candidateSince + NECK_START_DELAY_MS[sensitivity]
  if (now <= startAt) return 0
  return Math.min(NECK_MAX, (now - startAt) / NECK_GROW_MS)
}
