import { describe, expect, it } from 'vitest'
import { backoffMs } from './backoff'

describe('backoffMs', () => {
  it('2초에서 시작해 두 배씩 늘고 5분에서 멈춘다', () => {
    expect([0, 1, 2, 3].map((n) => backoffMs(n))).toEqual([2000, 4000, 8000, 16000])
    expect(backoffMs(20)).toBe(300_000)
  })

  it('retryAfter 가 더 길면 그걸 따른다', () => {
    expect(backoffMs(0, 30)).toBe(30_000)
    expect(backoffMs(5, 3)).toBe(64_000)
  })
})
