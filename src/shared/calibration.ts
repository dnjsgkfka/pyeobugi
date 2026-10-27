import type { PostureSample } from './detector'

/**
 * 얼굴 검출 상태머신.
 * 한 프레임만 놓쳐도 "얼굴 없음"이 되면 화면이 깜빡이므로, 연속으로 일정 프레임이
 * 같은 상태여야 바뀐다.
 */
export const FOUND_FRAMES = 3
export const LOST_FRAMES = 8

export type FaceState = 'searching' | 'found' | 'lost'

export class FaceTracker {
  private state: FaceState = 'searching'
  private streak = 0

  constructor(
    private readonly foundFrames: number = FOUND_FRAMES,
    private readonly lostFrames: number = LOST_FRAMES
  ) {}

  get value(): FaceState {
    return this.state
  }

  /** 샘플을 넣고 바뀐 상태를 돌려준다. */
  push(sample: PostureSample): FaceState {
    const wanted: FaceState = sample.face ? 'found' : 'lost'
    if (this.state === wanted) {
      this.streak = 0
      return this.state
    }
    this.streak++
    const needed = sample.face ? this.foundFrames : this.lostFrames
    if (this.streak >= needed) {
      this.state = wanted
      this.streak = 0
    }
    return this.state
  }

  reset(): void {
    this.state = 'searching'
    this.streak = 0
  }
}

/** 기준 자세. 서버로 보내지 않고 기기에만 저장한다. */
export interface Baseline {
  pitch: number
  size: number
}

export const CALIBRATION_MS = 3_000
/** 3초 동안 이만큼은 모여야 평균을 믿을 수 있다 (15fps 기준 약 2초치) */
export const MIN_SAMPLES = 30

export type CalibrationState =
  | { phase: 'waiting' }
  | { phase: 'measuring'; progress: number }
  | { phase: 'done'; baseline: Baseline }
  | { phase: 'failed'; reason: 'face-lost' | 'not-enough-samples' }

/**
 * 기준 자세 수집기.
 * 얼굴이 잡히면 3초를 재고, 그동안의 pitch·size 평균을 기준으로 삼는다.
 * 재는 중에 얼굴이 사라지면 실패로 끝낸다 (다시 시도할 수 있다).
 */
export class CalibrationCollector {
  private readonly tracker = new FaceTracker()
  private pitches: number[] = []
  private sizes: number[] = []
  private startedAt: number | null = null
  private state: CalibrationState = { phase: 'waiting' }

  constructor(private readonly durationMs: number = CALIBRATION_MS) {}

  get value(): CalibrationState {
    return this.state
  }

  push(sample: PostureSample): CalibrationState {
    if (this.state.phase === 'done' || this.state.phase === 'failed') return this.state
    const face = this.tracker.push(sample)

    if (face !== 'found') {
      // 재는 중에 놓쳤다면 실패, 아직 시작 전이면 계속 기다린다
      if (this.startedAt !== null) this.state = { phase: 'failed', reason: 'face-lost' }
      return this.state
    }
    if (sample.pitch === null || sample.size === null) return this.state

    if (this.startedAt === null) this.startedAt = sample.t
    this.pitches.push(sample.pitch)
    this.sizes.push(sample.size)

    const elapsed = sample.t - this.startedAt
    if (elapsed < this.durationMs) {
      this.state = { phase: 'measuring', progress: Math.min(elapsed / this.durationMs, 1) }
      return this.state
    }
    this.state =
      this.pitches.length >= MIN_SAMPLES
        ? { phase: 'done', baseline: { pitch: mean(this.pitches), size: mean(this.sizes) } }
        : { phase: 'failed', reason: 'not-enough-samples' }
    return this.state
  }

  reset(): void {
    this.tracker.reset()
    this.pitches = []
    this.sizes = []
    this.startedAt = null
    this.state = { phase: 'waiting' }
  }
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length
}
