/** 뽀모도로 상태머신. 시계는 밖에서 넣는다 (테스트에서 가짜 시계를 쓰기 위해서). */

export type PomodoroPhase = 'focus' | 'break'

export interface PomodoroState {
  phase: PomodoroPhase
  /** 남은 시간 (ms) */
  remainingMs: number
  running: boolean
  /** 오늘 끝낸 집중 횟수 */
  completed: number
}

export interface PomodoroOptions {
  /** 집중 시간 (기본 25분) */
  focusMs?: number
  /** 휴식 시간 (기본 5분) */
  breakMs?: number
}

export const FOCUS_MS = 25 * 60 * 1000
export const BREAK_MS = 5 * 60 * 1000

export interface TickResult {
  state: PomodoroState
  /** 이번에 집중 한 번을 끝냈다 → POMODORO_COMPLETED 를 보낸다 */
  focusCompleted: boolean
}

/**
 * 집중 25분 → 휴식 5분을 번갈아 돈다.
 * 집중이 끝날 때만 완료로 세고, 휴식이 끝나면 다음 집중으로 넘어간다.
 */
export class Pomodoro {
  private readonly focusMs: number
  private readonly breakMs: number

  private phase: PomodoroPhase = 'focus'
  private completed = 0
  /** 이번 구간이 끝나는 시각. 멈춰 있으면 null */
  private endsAt: number | null = null
  /** 멈춘 동안 남겨 둔 시간 */
  private paused: number

  constructor(options: PomodoroOptions = {}) {
    this.focusMs = options.focusMs ?? FOCUS_MS
    this.breakMs = options.breakMs ?? BREAK_MS
    this.paused = this.focusMs
  }

  get value(): PomodoroState {
    return {
      phase: this.phase,
      remainingMs: this.paused,
      running: this.endsAt !== null,
      completed: this.completed
    }
  }

  start(now: number): PomodoroState {
    if (this.endsAt === null) this.endsAt = now + this.paused
    return this.snapshot(now)
  }

  pause(now: number): PomodoroState {
    if (this.endsAt !== null) {
      this.paused = Math.max(0, this.endsAt - now)
      this.endsAt = null
    }
    return this.value
  }

  /** 처음부터 다시 (집중 시간으로 되돌린다). 끝낸 횟수는 남긴다. */
  stop(): PomodoroState {
    this.phase = 'focus'
    this.endsAt = null
    this.paused = this.focusMs
    return this.value
  }

  /** 1초마다 부른다. 구간이 끝났으면 다음 구간으로 넘긴다. */
  tick(now: number): TickResult {
    if (this.endsAt === null) return { state: this.value, focusCompleted: false }

    let focusCompleted = false
    // 창이 멈춰 있었다면 여러 구간이 한꺼번에 지났을 수 있다
    while (this.endsAt !== null && now >= this.endsAt) {
      const finishedAt = this.endsAt
      if (this.phase === 'focus') {
        this.completed++
        focusCompleted = true
        this.phase = 'break'
        this.endsAt = finishedAt + this.breakMs
      } else {
        this.phase = 'focus'
        this.endsAt = finishedAt + this.focusMs
      }
    }
    return { state: this.snapshot(now), focusCompleted }
  }

  private snapshot(now: number): PomodoroState {
    this.paused = this.endsAt === null ? this.paused : Math.max(0, this.endsAt - now)
    return this.value
  }
}

/** ms → "25:00" (1시간을 넘으면 "1:05:00") */
export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const seconds = total % 60
  const minutes = Math.floor(total / 60) % 60
  const hours = Math.floor(total / 3600)
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}

/** ms → "05:12:31" (감지 경과 시간) */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const parts = [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60]
  return parts.map((part) => String(part).padStart(2, '0')).join(':')
}
