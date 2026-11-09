import { BAD_ENTER_SCORE, postureScore, type Baseline } from './ai/score'
import type { Sensitivity } from './schemas/settings'

/**
 * 교정 강도
 *
 * AI 엔진은 진입·복귀 점수가 고정(`BAD_ENTER_SCORE` / `BAD_EXIT_SCORE`)이라 밖에서 바꿀 수 없다.
 * 대신 엔진에 넣는 기준 pitch 를 조금 옮기면 "몇 도부터 나쁜 자세로 볼지" 가 바뀐다.
 * 기준값 자체는 그대로 저장해 두고(재설정·거리 안내에 쓰인다), 판정에 넣을 때만 옮긴다.
 *
 * TODO(AI 팀): 진입·복귀 점수를 옵션으로 받을 수 있으면 이 우회가 필요 없다.
 */

/** 엔진 기본값으로 나쁜 자세가 되는 각도 (score = BAD_ENTER_SCORE 가 되는 지점) */
export const BASE_ENTER_DEG = enterDegreeOf(0)

/** 교정 강도별 목표 진입 각도 (0 느슨하게 / 1 보통 / 2 엄격하게) */
export const ENTER_DEG: Record<Sensitivity, number> = { 0: 15, 1: 10, 2: BASE_ENTER_DEG }

/** 기준보다 이만큼 더 숙였을 때 점수가 진입선에 닿는지 (0.1° 단위로 찾는다) */
function enterDegreeOf(offset: number): number {
  const baseline: Baseline = { pitch: offset, size: 0.3 }
  for (let deg = 0; deg <= 60; deg += 0.1) {
    // size 는 그대로 두고 pitch 만 본다 (얼굴 크기 항목은 더 숙인 뒤에야 더해진다)
    if (postureScore(offset + deg, baseline.size, baseline) >= BAD_ENTER_SCORE) {
      return Math.round(deg * 10) / 10
    }
  }
  return 60
}

/**
 * 판정에 넣을 기준값. 강도가 느슨하면 기준 pitch 를 아래로 옮겨 더 숙여야 걸리게 한다.
 * @param baseline 온보딩에서 잡은 기준값 (저장된 원본)
 */
export function tunedBaseline(baseline: Baseline, sensitivity: Sensitivity): Baseline {
  return { pitch: baseline.pitch + (ENTER_DEG[sensitivity] - BASE_ENTER_DEG), size: baseline.size }
}
