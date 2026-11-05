import type { PostureFeedback } from './ai/feedback'

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
/** 자세를 바로잡으면 이 속도로 줄어든다 */
export const NECK_SHRINK_MS = 450
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
 * 나쁜 자세가 이어지는 동안 목이 계속 늘어나고, 자세가 돌아오면 되돌아간다.
 * @param neck 지금 목 길이
 * @param mood 지금 상태
 * @param dtMs 지난 호출로부터 흐른 시간
 */
export function nextNeck(neck: number, mood: PetMood, dtMs: number): number {
  if (mood === 'bad') return Math.min(NECK_MAX, neck + dtMs / NECK_GROW_MS)
  return Math.max(0, neck - dtMs / NECK_SHRINK_MS)
}

/**
 * 거북목이 시작된 시각으로 목 길이를 구한다.
 * 추론은 1초에 한 번뿐이지만 이 값은 지금 시각으로 계산하므로 매 프레임 조금씩 늘어난다
 * (판정 결과가 올 때마다 맞추면 1초마다 한 칸씩 뛰어서 계단처럼 보인다).
 */
export function neckSince(badSince: number, now: number): number {
  return Math.min(NECK_MAX, Math.max(0, now - badSince) / NECK_GROW_MS)
}
