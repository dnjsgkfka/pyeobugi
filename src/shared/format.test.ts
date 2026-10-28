import { describe, expect, it } from 'vitest'
import {
  compareText,
  durationParts,
  formatAge,
  formatDuration,
  formatKstTime,
  formatRate,
  hourBand,
  peakText
} from './format'

describe('formatDuration', () => {
  it('시간과 분으로 나눈다', () => {
    expect(formatDuration(12600)).toBe('3시간 30분')
    expect(formatDuration(3660)).toBe('1시간 01분')
  })

  it('딱 떨어지면 분을 생략한다', () => {
    expect(formatDuration(7200)).toBe('2시간')
  })

  it('1시간 미만은 분만', () => {
    expect(formatDuration(1800)).toBe('30분')
  })

  it('1분 미만과 0', () => {
    expect(formatDuration(45)).toBe('1분 미만')
    expect(formatDuration(0)).toBe('0분')
    expect(formatDuration(-10)).toBe('0분')
  })

  it('초는 버린다 (반올림하지 않는다)', () => {
    expect(formatDuration(119)).toBe('1분')
  })
})

describe('durationParts', () => {
  it('시간이 있으면 두 쌍', () => {
    expect(durationParts(20400)).toEqual([
      { value: '5', unit: '시간' },
      { value: '40', unit: '분' }
    ])
  })

  it('1시간 미만이면 한 쌍', () => {
    expect(durationParts(1500)).toEqual([{ value: '25', unit: '분' }])
  })

  it('0이어도 분으로 보여준다', () => {
    expect(durationParts(0)).toEqual([{ value: '0', unit: '분' }])
  })
})

describe('formatRate', () => {
  it('숫자는 그대로, null 은 대시', () => {
    expect(formatRate(82)).toBe('82')
    expect(formatRate(0)).toBe('0')
    expect(formatRate(null)).toBe('–')
  })
})

describe('formatKstTime', () => {
  it('월·일·시각으로 줄인다', () => {
    expect(formatKstTime('2026-10-28T14:05:00+09:00')).toBe('10월 28일 14:05')
    expect(formatKstTime('2026-01-03T09:00:00+09:00')).toBe('1월 3일 09:00')
  })

  it('알 수 없는 형식은 그대로 둔다', () => {
    expect(formatKstTime('어제')).toBe('어제')
  })
})

describe('formatAge', () => {
  const now = new Date('2026-10-28T14:05:00+09:00')

  it('1분 미만은 방금', () => {
    expect(formatAge('2026-10-28T14:04:30+09:00', now)).toBe('방금')
  })

  it('분·시간·일', () => {
    expect(formatAge('2026-10-28T13:45:00+09:00', now)).toBe('20분 전')
    expect(formatAge('2026-10-28T11:05:00+09:00', now)).toBe('3시간 전')
    expect(formatAge('2026-10-26T14:05:00+09:00', now)).toBe('2일 전')
  })

  it('미래 시각은 방금으로 본다', () => {
    expect(formatAge('2026-10-28T14:10:00+09:00', now)).toBe('방금')
  })
})

describe('compareText', () => {
  it('늘었을 때와 줄었을 때', () => {
    expect(compareText(82, 76, '%p', '올랐어요', '줄었어요')).toBe('어제보다 6%p 올랐어요')
    expect(compareText(5, 8, '회', '늘었어요', '줄었어요')).toBe('어제보다 3회 줄었어요')
  })

  it('같으면 같다고 한다', () => {
    expect(compareText(10, 10, '회', '늘었어요', '줄었어요')).toBe('어제와 같아요')
  })

  it('비교할 값이 없으면 null', () => {
    expect(compareText(10, null, '회', '늘었어요', '줄었어요')).toBeNull()
    expect(compareText(null, 10, '회', '늘었어요', '줄었어요')).toBeNull()
    expect(compareText(10, undefined, '회', '늘었어요', '줄었어요')).toBeNull()
  })
})

describe('hourBand', () => {
  it('오전·오후·저녁', () => {
    expect(hourBand(9)).toBe('오전 9시대')
    expect(hourBand(14)).toBe('오후 2시대')
    expect(hourBand(19)).toBe('저녁 7시대')
  })
})

describe('peakText', () => {
  it('두 시간대를 묶어 말한다', () => {
    expect(peakText([14, 14, 19])).toBe('오후 2시대와 저녁 7시대에 몰려 있어요')
  })

  it('하나뿐이거나 없을 때', () => {
    expect(peakText([14])).toBe('오후 2시대에 몰려 있어요')
    expect(peakText([])).toBe('오늘은 거북목이 없었어요')
  })
})
