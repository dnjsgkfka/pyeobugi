import { describe, expect, it } from 'vitest'
import { BREAK_MS, FOCUS_MS, Pomodoro, formatElapsed, formatRemaining } from './pomodoro'

const T0 = 1_000_000

describe('Pomodoro', () => {
  it('처음에는 멈춰 있고 집중 25분이 남아 있다', () => {
    expect(new Pomodoro().value).toEqual({
      phase: 'focus',
      remainingMs: FOCUS_MS,
      running: false,
      completed: 0
    })
  })

  it('시작하면 시간이 줄어든다', () => {
    const p = new Pomodoro()
    p.start(T0)
    expect(p.tick(T0 + 60_000).state.remainingMs).toBe(FOCUS_MS - 60_000)
  })

  it('집중이 끝나면 완료 1회 + 휴식으로 넘어간다', () => {
    const p = new Pomodoro()
    p.start(T0)
    const result = p.tick(T0 + FOCUS_MS)
    expect(result.focusCompleted).toBe(true)
    expect(result.state.phase).toBe('break')
    expect(result.state.completed).toBe(1)
    expect(result.state.remainingMs).toBe(BREAK_MS)
  })

  it('휴식이 끝나면 다음 집중으로 넘어간다 (완료는 늘지 않는다)', () => {
    const p = new Pomodoro()
    p.start(T0)
    p.tick(T0 + FOCUS_MS)
    const result = p.tick(T0 + FOCUS_MS + BREAK_MS)
    expect(result.focusCompleted).toBe(false)
    expect(result.state.phase).toBe('focus')
    expect(result.state.completed).toBe(1)
  })

  it('집중이 끝나기 전에는 완료로 치지 않는다', () => {
    const p = new Pomodoro()
    p.start(T0)
    expect(p.tick(T0 + FOCUS_MS - 1).focusCompleted).toBe(false)
    expect(p.value.completed).toBe(0)
  })

  it('멈췄다 다시 시작하면 남은 시간이 이어진다', () => {
    const p = new Pomodoro()
    p.start(T0)
    p.pause(T0 + 10 * 60_000)
    expect(p.value.remainingMs).toBe(FOCUS_MS - 10 * 60_000)
    expect(p.value.running).toBe(false)

    // 멈춰 있는 동안은 시간이 흘러도 그대로
    expect(p.tick(T0 + 60 * 60_000).state.remainingMs).toBe(FOCUS_MS - 10 * 60_000)

    p.start(T0 + 60 * 60_000)
    expect(p.tick(T0 + 60 * 60_000 + 60_000).state.remainingMs).toBe(FOCUS_MS - 11 * 60_000)
  })

  it('멈추면 집중 시간으로 되돌아간다 (끝낸 횟수는 남는다)', () => {
    const p = new Pomodoro()
    p.start(T0)
    p.tick(T0 + FOCUS_MS)
    expect(p.stop()).toEqual({
      phase: 'focus',
      remainingMs: FOCUS_MS,
      running: false,
      completed: 1
    })
  })

  it('한참 뒤에 깨어나도 지나간 구간을 한꺼번에 넘긴다', () => {
    const p = new Pomodoro()
    p.start(T0)
    // 집중 → 휴식 → 집중까지 지난 시점
    const result = p.tick(T0 + FOCUS_MS + BREAK_MS + 60_000)
    expect(result.state.phase).toBe('focus')
    expect(result.state.completed).toBe(1)
    expect(result.state.remainingMs).toBe(FOCUS_MS - 60_000)
  })

  it('집중을 두 번 끝내면 완료가 2회', () => {
    const p = new Pomodoro()
    p.start(T0)
    p.tick(T0 + FOCUS_MS)
    p.tick(T0 + FOCUS_MS + BREAK_MS)
    expect(p.tick(T0 + 2 * FOCUS_MS + BREAK_MS).state.completed).toBe(2)
  })

  it('짧게 맞춰 두면 그 길이로 돈다 (FAST 모드)', () => {
    const p = new Pomodoro({ focusMs: 10_000, breakMs: 5_000 })
    p.start(T0)
    expect(p.tick(T0 + 10_000).focusCompleted).toBe(true)
    expect(p.value.phase).toBe('break')
    expect(p.value.remainingMs).toBe(5_000)
  })
})

describe('formatRemaining', () => {
  it('분:초', () => {
    expect(formatRemaining(FOCUS_MS)).toBe('25:00')
    expect(formatRemaining(61_000)).toBe('01:01')
    expect(formatRemaining(0)).toBe('00:00')
    expect(formatRemaining(-5)).toBe('00:00')
  })

  it('1시간이 넘으면 시간까지', () => {
    expect(formatRemaining(3_900_000)).toBe('1:05:00')
  })

  it('남은 초는 올림한다 (0.5초 남았는데 00:00 으로 보이지 않게)', () => {
    expect(formatRemaining(500)).toBe('00:01')
  })
})

describe('formatElapsed', () => {
  it('시:분:초', () => {
    expect(formatElapsed(18_751_000)).toBe('05:12:31')
    expect(formatElapsed(0)).toBe('00:00:00')
  })
})
