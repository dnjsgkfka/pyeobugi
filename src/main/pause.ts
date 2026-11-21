/** Tray pause choices. `ms: null` means paused until the user resumes. */
export const PAUSE_OPTIONS = [
  { label: '30분', ms: 30 * 60_000 },
  { label: '1시간', ms: 60 * 60_000 },
  { label: '다시 켤 때까지', ms: null }
] as const

/**
 * Keeps track of a detection pause and resumes when the time is up.
 * Has no Electron dependency so it can be unit tested.
 */
export class PauseTimer {
  private timer: ReturnType<typeof setTimeout> | null = null
  private active = false
  private endsAt: number | null = null

  get paused(): boolean {
    return this.active
  }

  /** Epoch ms when the pause ends, or null when it lasts until resumed */
  get until(): number | null {
    return this.endsAt
  }

  start(durationMs: number | null, onEnd: () => void, now: number = Date.now()): void {
    this.cancel()
    this.active = true
    if (durationMs === null) return
    this.endsAt = now + durationMs
    this.timer = setTimeout(() => {
      this.cancel()
      onEnd()
    }, durationMs)
  }

  cancel(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    this.active = false
    this.endsAt = null
  }
}
