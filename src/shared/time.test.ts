import { describe, expect, it } from 'vitest'
import {
  isKstDateString,
  kstDateString,
  kstNextMidnight,
  kstStartOfDay,
  kstWeekStart,
  splitAtKstMidnight,
  toKstIso
} from './time'

describe('KST 유틸', () => {
  it('UTC 시각을 +09:00 ISO 로 바꾸고 초 아래는 버린다', () => {
    expect(toKstIso(new Date('2026-10-04T00:22:00.789Z'))).toBe('2026-10-04T09:22:00+09:00')
  })

  it('날짜 경계는 KST 기준이다', () => {
    expect(kstDateString(new Date('2026-10-03T14:59:59Z'))).toBe('2026-10-03')
    expect(kstDateString(new Date('2026-10-03T15:00:00Z'))).toBe('2026-10-04')
  })

  it('하루 시작과 다음 자정', () => {
    const d = new Date('2026-10-04T14:05:00+09:00')
    expect(toKstIso(kstStartOfDay(d))).toBe('2026-10-04T00:00:00+09:00')
    expect(toKstIso(kstNextMidnight(d))).toBe('2026-10-05T00:00:00+09:00')
  })

  it('주의 시작은 월요일 00:00 이다 (일요일도 같은 주)', () => {
    expect(toKstIso(kstWeekStart(new Date('2026-10-04T14:05:00+09:00')))).toBe(
      '2026-09-28T00:00:00+09:00'
    )
    expect(toKstIso(kstWeekStart(new Date('2026-10-05T00:00:00+09:00')))).toBe(
      '2026-10-05T00:00:00+09:00'
    )
  })

  it('자정을 넘는 구간은 자정에서 둘로 나눈다', () => {
    const parts = splitAtKstMidnight(
      new Date('2026-10-04T23:30:00+09:00'),
      new Date('2026-10-05T00:30:00+09:00')
    )
    expect(parts.map((p) => [toKstIso(p.start), toKstIso(p.end)])).toEqual([
      ['2026-10-04T23:30:00+09:00', '2026-10-05T00:00:00+09:00'],
      ['2026-10-05T00:00:00+09:00', '2026-10-05T00:30:00+09:00']
    ])
  })

  it('자정을 넘지 않으면 그대로 한 구간', () => {
    const parts = splitAtKstMidnight(
      new Date('2026-10-04T09:00:00+09:00'),
      new Date('2026-10-04T09:01:00+09:00')
    )
    expect(parts).toHaveLength(1)
  })

  it('날짜 문자열 검증', () => {
    expect(isKstDateString('2026-10-04')).toBe(true)
    expect(isKstDateString('2026-02-30')).toBe(false)
    expect(isKstDateString('2026-1-4')).toBe(false)
  })
})
