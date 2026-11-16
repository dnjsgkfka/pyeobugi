import { floorToSecond, kstNextMidnight, toKstIso } from './time'

/** USAGE_SEGMENT 의 payload (서버 스키마와 같은 모양) */
export interface UsageSegment {
  startedAt: string
  endedAt: string
  durationSec: number
  badDurationSec: number
  /**
   * 나쁜 자세 시간 중 '살짝 숙임'(MILD) 이었던 시간.
   * 서버가 `badDurationSec - mildDurationSec` 를 거북목으로 집계한다.
   * 보내지 않으면 나쁜 자세 전부가 거북목이 되므로 항상 보낸다 (0 포함).
   */
  mildDurationSec: number
}

export interface UsageOptions {
  /** 구간 길이 (기본 1분) */
  segmentMs?: number
  /**
   * 이만큼 얼굴이 안 보이면 자리를 비운 것으로 보고 구간을 마감한다.
   * 그보다 짧은 미검출은 사용 시간에 포함한다 (잠깐 고개를 돌리는 정도).
   * TODO(PM 확인): 기본 30초
   */
  awayMs?: number
  /**
   * 업데이트 간격이 이보다 길면 그 사이는 세지 않는다.
   * 절전 모드에서 깨어났을 때 몇 시간이 통째로 사용 시간이 되는 것을 막는다.
   */
  maxGapMs?: number
}

export interface UsageInput {
  face: boolean
  /** 나쁜 자세로 확정된 상태인가 */
  bad: boolean
  /** 그 나쁜 자세가 '살짝 숙임'(MILD) 인가. `bad` 가 아니면 무시한다 */
  mild?: boolean
}

const SECOND = 1000

/**
 * 사용 구간 생성기.
 *
 * 1분마다 구간을 만들고, 자리를 비우거나 KST 자정을 넘거나 멈출 때 마감한다.
 * 이어지는 구간은 앞 구간의 `endedAt` 에서 시작한다 (서버가 겹침 없이 합산할 수 있게).
 *
 * 시계는 밖에서 넣는다 (`update(now, …)`). 테스트에서 가짜 시계를 쓰기 위해서다.
 */
export class UsageTracker {
  private readonly segmentMs: number
  private readonly awayMs: number
  private readonly maxGapMs: number

  /** 현재 구간의 시작 (ms, 초 단위로 버림). null 이면 구간이 없다 */
  private startedAt: number | null = null
  private lastAt = 0
  private badMs = 0
  /** badMs 의 일부 (MILD 였던 시간) */
  private mildMs = 0
  /** 얼굴이 안 보이기 시작한 시각. 자리비움 판단에 쓴다 */
  private lostAt: number | null = null

  constructor(options: UsageOptions = {}) {
    this.segmentMs = options.segmentMs ?? 60 * SECOND
    this.awayMs = options.awayMs ?? 30 * SECOND
    this.maxGapMs = options.maxGapMs ?? 5 * SECOND
  }

  get hasSegment(): boolean {
    return this.startedAt !== null
  }

  /** 샘플을 넣고, 이번에 마감된 구간들을 돌려준다. */
  update(now: number, input: UsageInput): UsageSegment[] {
    if (this.startedAt === null) {
      if (input.face) this.begin(now)
      return []
    }

    const gap = now - this.lastAt
    if (gap < 0 || gap > this.maxGapMs) {
      // 시계가 튀었다 (절전에서 깨어남 등) → 마지막으로 본 시점까지만 세고 끊는다
      const segments = this.close(this.lastAt)
      if (input.face) this.begin(now)
      return segments
    }

    if (!input.face) {
      if (this.lostAt === null) this.lostAt = this.lastAt
      if (now - this.lostAt >= this.awayMs) {
        // 자리를 비웠다 → 얼굴이 사라진 시점에 마감하고, 그 뒤 시간은 세지 않는다
        return this.close(this.lostAt)
      }
      // 짧은 미검출인지 자리비움인지 아직 모른다.
      // 여기서 구간을 내보내면 나중에 "사라진 시점으로 되돌리기"를 할 수 없으므로,
      // 1분 경계를 넘더라도 판단이 설 때까지 미룬다 (얼굴이 돌아오면 그때 한꺼번에 내보낸다).
      this.lastAt = now
      return []
    }

    this.lostAt = null
    return this.advance(now, input.bad, input.mild === true)
  }

  /** 일시정지, 타이머 종료, 앱 종료 때 남은 구간을 마감한다. */
  flush(now: number): UsageSegment[] {
    if (this.startedAt === null) return []
    // 자리를 비운 상태였다면 사라진 시점까지만 센다
    const end = this.lostAt !== null && now - this.lostAt >= this.awayMs ? this.lostAt : now
    return this.close(end)
  }

  private begin(now: number): void {
    this.startedAt = floorToSecond(new Date(now)).getTime()
    this.lastAt = now
    this.badMs = 0
    this.mildMs = 0
    this.lostAt = null
  }

  /** `lastAt` 부터 `now` 까지를 센다. 구간 경계나 자정을 지나면 거기서 끊는다. */
  private advance(now: number, bad: boolean, mild: boolean): UsageSegment[] {
    const segments: UsageSegment[] = []
    let from = this.lastAt

    while (this.startedAt !== null) {
      const boundary = Math.min(
        this.startedAt + this.segmentMs,
        kstNextMidnight(new Date(this.startedAt)).getTime()
      )
      if (now < boundary) break

      // 미검출로 미뤄 둔 사이에 경계가 지나갔을 수 있다 → 음수가 되지 않게 한다
      const span = Math.max(0, boundary - from)
      if (bad) this.badMs += span
      if (bad && mild) this.mildMs += span
      const segment = this.makeSegment(this.startedAt, boundary)
      if (segment) segments.push(segment)
      // 다음 구간은 앞 구간이 끝난 자리에서 이어 시작한다
      this.startedAt = boundary
      this.badMs = 0
      this.mildMs = 0
      from = boundary
    }

    const rest = Math.max(0, now - from)
    if (bad) this.badMs += rest
    if (bad && mild) this.mildMs += rest
    this.lastAt = now
    return segments
  }

  private close(end: number): UsageSegment[] {
    const start = this.startedAt
    this.startedAt = null
    this.lostAt = null
    const badMs = this.badMs
    const mildMs = this.mildMs
    this.badMs = 0
    this.mildMs = 0
    if (start === null) return []

    // 마감하는 사이에 자정을 넘었다면 거기서 한 번 더 끊는다
    const segments: UsageSegment[] = []
    let from = start
    let remaining = badMs
    let remainingMild = mildMs
    while (from < end) {
      const midnight = kstNextMidnight(new Date(from)).getTime()
      const to = Math.min(midnight, end)
      // 나쁜 자세 시간은 마지막 조각에 몰아넣지 않고 길이에 비례해 나눈다
      const ratio = (to - from) / (end - from)
      const share = Math.round(remaining * ratio)
      const shareMild = Math.min(Math.round(remainingMild * ratio), share)
      const segment = this.makeSegment(from, to, share, shareMild)
      if (segment) segments.push(segment)
      remaining -= share
      remainingMild -= shareMild
      from = to
    }
    return segments
  }

  private makeSegment(
    start: number,
    end: number,
    badMs = this.badMs,
    mildMs = this.mildMs
  ): UsageSegment | null {
    const startedAt = floorToSecond(new Date(start))
    const endedAt = floorToSecond(new Date(end))
    const durationSec = Math.round((endedAt.getTime() - startedAt.getTime()) / SECOND)
    if (durationSec < 1) return null
    const badDurationSec = Math.min(Math.max(Math.round(badMs / SECOND), 0), durationSec)
    return {
      startedAt: toKstIso(startedAt),
      endedAt: toKstIso(endedAt),
      durationSec,
      // 밀리초로 모았다가 반올림하고, 사용 시간을 넘지 않게 맞춘다
      badDurationSec,
      // 서버가 0 <= mild <= bad 를 요구한다
      mildDurationSec: Math.min(Math.max(Math.round(mildMs / SECOND), 0), badDurationSec)
    }
  }
}
