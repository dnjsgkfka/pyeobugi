import { describe, expect, it } from 'vitest'
import { BAD_ENTER_SCORE, postureScore } from './ai/score'
import { BASE_ENTER_DEG, ENTER_DEG, tunedBaseline } from './sensitivity'

const BASELINE = { pitch: 0, size: 0.3 }

/** 기준보다 deg 만큼 더 숙였을 때의 점수 */
function score(deg: number, sensitivity: 0 | 1 | 2): number {
  const tuned = tunedBaseline(BASELINE, sensitivity)
  return postureScore(BASELINE.pitch + deg, BASELINE.size, tuned)
}

describe('교정 강도', () => {
  it('엔진 기본 진입 각도는 7도 안쪽이다', () => {
    expect(BASE_ENTER_DEG).toBeGreaterThan(5)
    expect(BASE_ENTER_DEG).toBeLessThan(8)
  })

  it('강도마다 나쁜 자세로 보는 각도가 다르다', () => {
    for (const sensitivity of [0, 1, 2] as const) {
      const target = ENTER_DEG[sensitivity]
      expect(score(target - 1, sensitivity)).toBeLessThan(BAD_ENTER_SCORE)
      expect(score(target + 1, sensitivity)).toBeGreaterThanOrEqual(BAD_ENTER_SCORE)
    }
  })

  it('느슨하게 < 보통 < 엄격하게 순으로 민감하다', () => {
    expect(score(10, 0)).toBeLessThan(score(10, 1))
    expect(score(10, 1)).toBeLessThan(score(10, 2))
  })

  it('얼굴 크기 기준은 건드리지 않는다 (거리 변화 안내가 틀어지지 않게)', () => {
    for (const sensitivity of [0, 1, 2] as const) {
      expect(tunedBaseline(BASELINE, sensitivity).size).toBe(BASELINE.size)
    }
  })
})
