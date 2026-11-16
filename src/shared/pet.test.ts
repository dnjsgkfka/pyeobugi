import { describe, expect, it } from 'vitest'
import { TIMING } from './ai/engine'
import { NECK_GROW_MS, NECK_MAX, NECK_START_DELAY_MS, neckFrom } from './pet'

const T0 = 1_000_000

describe('neckFrom', () => {
  it('후보가 없으면 0 이다', () => {
    expect(neckFrom(null, 1, T0)).toBe(0)
  })

  it('엄격하게(2)는 후보가 된 순간부터 늘어난다', () => {
    expect(neckFrom(T0, 2, T0)).toBe(0)
    expect(neckFrom(T0, 2, T0 + NECK_GROW_MS)).toBeCloseTo(1)
  })

  it('보통(1)은 1.5초 뒤부터 늘어난다', () => {
    expect(neckFrom(T0, 1, T0 + 1_400)).toBe(0)
    expect(neckFrom(T0, 1, T0 + 1_500)).toBe(0)
    expect(neckFrom(T0, 1, T0 + 1_500 + NECK_GROW_MS)).toBeCloseTo(1)
  })

  it('느슨하게(0)는 나쁜 자세로 확정되는 시점부터 늘어난다', () => {
    const confirmed = T0 + TIMING.enterAfterMs
    expect(neckFrom(T0, 0, confirmed)).toBe(0)
    expect(neckFrom(T0, 0, confirmed + NECK_GROW_MS)).toBeCloseTo(1)
  })

  it('강도가 셀수록 같은 시점에 목이 더 길다', () => {
    const now = T0 + 4_000
    expect(neckFrom(T0, 2, now)).toBeGreaterThan(neckFrom(T0, 1, now))
    expect(neckFrom(T0, 1, now)).toBeGreaterThan(neckFrom(T0, 0, now))
  })

  it('지연은 확정 시간(enterAfterMs)에서 끌어온다', () => {
    expect(NECK_START_DELAY_MS[0]).toBe(TIMING.enterAfterMs)
    expect(NECK_START_DELAY_MS[2]).toBe(0)
  })

  it('NECK_MAX 를 넘지 않는다', () => {
    expect(neckFrom(T0, 2, T0 + NECK_GROW_MS * 1000)).toBe(NECK_MAX)
  })
})
