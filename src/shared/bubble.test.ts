import { describe, expect, it } from 'vitest'
import { BubblePicker, COOLDOWN_MS, MIN_GAP_MS, SHOW_MS } from './bubble'

const QUIET = { posture: false, distance: false }

describe('BubblePicker', () => {
  it('거북목이면 자세 말풍선을 조건이 끝날 때까지 보여 준다', () => {
    const picker = new BubblePicker()
    expect(picker.update(0, { posture: true, distance: false })?.kind).toBe('posture')
    expect(picker.update(60_000, { posture: true, distance: false })?.kind).toBe('posture')
    expect(picker.update(61_000, QUIET)).toBeNull()
  })

  it('한 번뿐인 말풍선은 SHOW_MS 동안만 뜬다', () => {
    const picker = new BubblePicker()
    picker.trigger('encourage', 0)
    expect(picker.update(0, QUIET)?.kind).toBe('encourage')
    expect(picker.update(SHOW_MS - 1, QUIET)?.kind).toBe('encourage')
    expect(picker.update(SHOW_MS, QUIET)).toBeNull()
  })

  it('겹치면 우선순위 하나만 뜬다 (자세 > 휴식 > 보상)', () => {
    const picker = new BubblePicker()
    picker.trigger('encourage', 0)
    picker.trigger('timer-break', 0)
    expect(picker.update(0, { posture: true, distance: false })?.kind).toBe('posture')
  })

  it('급한 것이 생기면 떠 있던 것을 밀어낸다', () => {
    const picker = new BubblePicker()
    picker.trigger('greeting', 0)
    expect(picker.update(0, QUIET)?.kind).toBe('greeting')
    expect(picker.update(100, { posture: true, distance: false })?.kind).toBe('posture')
  })

  it('말풍선 사이에 최소 간격을 둔다', () => {
    const picker = new BubblePicker()
    picker.trigger('greeting', 0)
    picker.update(0, QUIET)
    picker.trigger('timer-break', 0)
    // greeting 이 끝난 직후에는 뜨지 않는다
    expect(picker.update(SHOW_MS, QUIET)).toBeNull()
    expect(picker.update(SHOW_MS + MIN_GAP_MS, QUIET)?.kind).toBe('timer-break')
  })

  it('같은 종류는 쿨다운만큼 쉰다', () => {
    const picker = new BubblePicker()
    picker.trigger('encourage', 0)
    expect(picker.update(0, QUIET)?.kind).toBe('encourage')
    const after = SHOW_MS + MIN_GAP_MS
    picker.trigger('encourage', after)
    expect(picker.update(after, QUIET)).toBeNull()
    const later = COOLDOWN_MS.encourage + 1
    picker.trigger('encourage', later)
    expect(picker.update(later, QUIET)?.kind).toBe('encourage')
  })

  it('거리 안내는 POSTURE 로 집계하고 누르면 재설정으로 보낸다', () => {
    const picker = new BubblePicker()
    const bubble = picker.update(0, { posture: false, distance: true })
    expect(bubble).toMatchObject({ kind: 'distance', event: 'POSTURE', action: 'recalibrate' })
  })

  it('reset 하면 예약과 떠 있던 것이 사라진다', () => {
    const picker = new BubblePicker()
    picker.trigger('greeting', 0)
    picker.update(0, QUIET)
    picker.reset()
    expect(picker.update(100, QUIET)).toBeNull()
  })
})
