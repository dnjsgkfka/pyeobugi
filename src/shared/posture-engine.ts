import type { Baseline } from './calibration'
import type { PostureSample } from './detector'
import { deviationFrom, severityOf, type PostureThresholds, type Severity } from './posture'

/**
 * 자세 상태.
 * - good: 바른 자세
 * - slipping: 기준을 벗어났지만 아직 확정 전 (holdMs 를 채우는 중)
 * - bad: 나쁜 자세로 확정됨
 * - away: 얼굴이 보이지 않음 (나쁜 자세로 세지 않는다)
 */
export type PostureState = 'good' | 'slipping' | 'bad' | 'away'

export interface PostureResult {
  state: PostureState
  /** 나쁜 자세로 막 확정된 순간에만 채워진다 → 이때 한 번만 POSTURE_BAD 를 보낸다 */
  enteredBad: Severity | null
  /**
   * 나쁜 자세가 시작된 시각 (샘플 시계). 확정된 순간에만 채워진다.
   * POSTURE_BAD 의 occurredAt 은 판정 시각이 아니라 이 시각이어야 한다 (AI/BE 인수인계 문서).
   */
  badSince: number | null
  /** slipping 일 때 확정까지의 진행률 0~1 */
  progress: number
}

const GOOD: PostureResult = { state: 'good', enteredBad: null, badSince: null, progress: 0 }

/**
 * 자세 판정 엔진.
 *
 * 기준을 벗어난 상태가 holdMs 동안 이어져야 나쁜 자세로 확정하고, 그때 한 번만
 * `enteredBad` 를 돌려준다. 계속 숙이고 있어도 다시 돌려주지 않는다.
 * 바른 자세가 recoverMs 동안 이어지면 복귀하고, 그 뒤 다시 나빠지면 또 한 번 확정한다.
 *
 * 얼굴이 보이지 않는 동안은 판정을 멈추고 상태를 비운다. 자리를 비운 시간이
 * 나쁜 자세로 쌓이면 안 되고, 돌아왔을 때는 처음부터 다시 봐야 한다.
 */
export class PostureEngine {
  private state: PostureState = 'good'
  /** 기준을 벗어나기 시작한 시각 (slipping) */
  private slipSince: number | null = null
  /** 바른 자세로 돌아온 시각 (bad 에서 복귀 중) */
  private recoverSince: number | null = null
  /** 확정 직전까지의 최대 벗어남 → severity 는 가장 심했던 정도로 매긴다 */
  private peakScore = 0

  constructor(
    private baseline: Baseline,
    private thresholds: PostureThresholds
  ) {}

  get value(): PostureState {
    return this.state
  }

  /** 설정에서 민감도를 바꾸거나 기준을 다시 잡았을 때 */
  configure(baseline: Baseline, thresholds: PostureThresholds): void {
    this.baseline = baseline
    this.thresholds = thresholds
    this.reset()
  }

  reset(): void {
    this.state = 'good'
    this.slipSince = null
    this.recoverSince = null
    this.peakScore = 0
  }

  push(sample: PostureSample): PostureResult {
    if (!sample.face || sample.pitch === null || sample.size === null) {
      // 자리를 비웠거나 얼굴을 놓쳤다 → 판정을 멈추고 비운다
      this.state = 'away'
      this.slipSince = null
      this.recoverSince = null
      this.peakScore = 0
      return { state: 'away', enteredBad: null, badSince: null, progress: 0 }
    }

    if (this.state === 'away') this.state = 'good'

    const { score } = deviationFrom(this.baseline, sample.pitch, sample.size, this.thresholds)

    // 진입과 복귀의 기준선을 다르게 둬서 기준 근처에서 깜빡이지 않게 한다
    if (this.state === 'bad') return this.whileBad(sample.t, score >= this.thresholds.exitScore)
    return this.whileGood(sample.t, score >= 1, score)
  }

  /** 아직 나쁜 자세로 확정되기 전 */
  private whileGood(now: number, over: boolean, score: number): PostureResult {
    if (!over) {
      this.slipSince = null
      this.peakScore = 0
      this.state = 'good'
      return GOOD
    }

    if (this.slipSince === null) this.slipSince = now
    this.peakScore = Math.max(this.peakScore, score)

    const held = now - this.slipSince
    if (held < this.thresholds.holdMs) {
      this.state = 'slipping'
      return {
        state: 'slipping',
        enteredBad: null,
        badSince: null,
        progress: held / this.thresholds.holdMs
      }
    }

    this.state = 'bad'
    const since = this.slipSince
    this.slipSince = null
    this.recoverSince = null
    const severity = severityOf(this.peakScore, this.thresholds)
    this.peakScore = 0
    return { state: 'bad', enteredBad: severity, badSince: since, progress: 1 }
  }

  /** 나쁜 자세로 확정된 뒤 — 복귀를 기다린다 (기준은 exitScore, 진입보다 낮다) */
  private whileBad(now: number, stillOver: boolean): PostureResult {
    if (stillOver) {
      // 다시 나빠졌다 → 복귀 시계를 되돌린다
      this.recoverSince = null
      return { state: 'bad', enteredBad: null, badSince: null, progress: 1 }
    }

    if (this.recoverSince === null) this.recoverSince = now
    if (now - this.recoverSince < this.thresholds.recoverMs) {
      return { state: 'bad', enteredBad: null, badSince: null, progress: 1 }
    }

    this.state = 'good'
    this.recoverSince = null
    this.peakScore = 0
    return GOOD
  }
}
