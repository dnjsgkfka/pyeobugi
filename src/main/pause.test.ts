import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PauseTimer } from './pause'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('PauseTimer', () => {
  it('resumes once the duration has passed', () => {
    const timer = new PauseTimer()
    const onEnd = vi.fn()
    timer.start(30 * 60_000, onEnd, 1_000)
    expect(timer.paused).toBe(true)
    expect(timer.until).toBe(1_000 + 30 * 60_000)

    vi.advanceTimersByTime(30 * 60_000 - 1)
    expect(onEnd).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(timer.paused).toBe(false)
    expect(timer.until).toBeNull()
  })

  it('stays paused with no end time when duration is null', () => {
    const timer = new PauseTimer()
    const onEnd = vi.fn()
    timer.start(null, onEnd)
    vi.advanceTimersByTime(24 * 60 * 60_000)
    expect(timer.paused).toBe(true)
    expect(timer.until).toBeNull()
    expect(onEnd).not.toHaveBeenCalled()
  })

  it('does not resume after being cancelled', () => {
    const timer = new PauseTimer()
    const onEnd = vi.fn()
    timer.start(60_000, onEnd)
    timer.cancel()
    vi.advanceTimersByTime(60_000)
    expect(onEnd).not.toHaveBeenCalled()
    expect(timer.paused).toBe(false)
  })

  it('replaces the previous pause when started again', () => {
    const timer = new PauseTimer()
    const first = vi.fn()
    const second = vi.fn()
    timer.start(60_000, first, 0)
    timer.start(120_000, second, 0)
    vi.advanceTimersByTime(60_000)
    expect(first).not.toHaveBeenCalled()
    vi.advanceTimersByTime(60_000)
    expect(second).toHaveBeenCalledTimes(1)
  })
})
