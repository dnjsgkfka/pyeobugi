import { describe, expect, it } from 'vitest'
import { validateEvent } from './schemas/events'
import { TEST_SESSION_ID } from './testing'
import { toKstIso } from './time'
import { UsageTracker, type UsageSegment } from './usage'

const START = Date.parse('2026-10-27T10:00:00+09:00')
const SECOND = 1000
const MINUTE = 60 * SECOND

/** 가짜 시계. tick 마다 샘플을 하나 넣는다 */
class Clock {
  now = START
  readonly segments: UsageSegment[] = []

  constructor(
    private readonly tracker: UsageTracker,
    private readonly stepMs = SECOND
  ) {}

  /** ms 만큼 시간을 보낸다. 지금 시각에서 한 번 넣고, step 간격으로 이어 넣는다 */
  run(ms: number, input: { face?: boolean; bad?: boolean } = {}): this {
    const { face = true, bad = false } = input
    const until = this.now + ms
    this.segments.push(...this.tracker.update(this.now, { face, bad }))
    while (this.now < until) {
      this.now = Math.min(this.now + this.stepMs, until)
      this.segments.push(...this.tracker.update(this.now, { face, bad }))
    }
    return this
  }

  flush(): this {
    this.segments.push(...this.tracker.flush(this.now))
    return this
  }
}

function clock(stepMs = SECOND, options = {}): Clock {
  return new Clock(new UsageTracker(options), stepMs)
}

const total = (segments: UsageSegment[]): number =>
  segments.reduce((sum, s) => sum + s.durationSec, 0)
const totalBad = (segments: UsageSegment[]): number =>
  segments.reduce((sum, s) => sum + s.badDurationSec, 0)

/** 서버가 받는 그대로 검증한다 */
function asEvent(segment: UsageSegment): unknown {
  return {
    eventId: crypto.randomUUID(),
    type: 'USAGE_SEGMENT',
    sessionId: TEST_SESSION_ID,
    occurredAt: segment.endedAt,
    payload: segment
  }
}

describe('UsageTracker', () => {
  it('1분마다 구간을 만든다', () => {
    const c = clock().run(3 * MINUTE + 10 * SECOND)
    expect(c.segments).toHaveLength(3)
    expect(c.segments.map((s) => s.durationSec)).toEqual([60, 60, 60])
    expect(c.segments[0].startedAt).toBe('2026-10-27T10:00:00+09:00')
    expect(c.segments[0].endedAt).toBe('2026-10-27T10:01:00+09:00')
  })

  it('이어지는 구간은 앞 구간이 끝난 자리에서 시작한다 (겹치지 않는다)', () => {
    const c = clock().run(5 * MINUTE)
    for (let i = 1; i < c.segments.length; i++) {
      expect(c.segments[i].startedAt).toBe(c.segments[i - 1].endedAt)
    }
  })

  it('나쁜 자세 시간만 badDurationSec 에 쌓인다', () => {
    const c = clock()
      .run(20 * SECOND)
      .run(15 * SECOND, { bad: true })
      .run(25 * SECOND)
    expect(c.segments).toHaveLength(1)
    expect(c.segments[0].durationSec).toBe(60)
    expect(c.segments[0].badDurationSec).toBe(15)
  })

  it('멈출 때 남은 구간을 마감한다', () => {
    const c = clock()
      .run(90 * SECOND)
      .flush()
    expect(c.segments).toHaveLength(2)
    expect(c.segments[1].durationSec).toBe(30)
    expect(total(c.segments)).toBe(90)
  })

  it('구간이 없을 때 멈추면 아무것도 만들지 않는다', () => {
    const c = clock().flush()
    expect(c.segments).toEqual([])
  })

  describe('얼굴 미검출', () => {
    it('짧은 미검출은 사용 시간에 포함되고 나쁜 자세에는 포함되지 않는다', () => {
      const c = clock()
        .run(20 * SECOND, { bad: true })
        .run(10 * SECOND, { face: false, bad: true }) // 안 보이는 동안은 bad 로 안 센다
        .run(30 * SECOND)
      expect(c.segments).toHaveLength(1)
      expect(c.segments[0].durationSec).toBe(60) // 미검출 10초도 사용 시간
      expect(c.segments[0].badDurationSec).toBe(20) // 나쁜 자세는 20초만
    })

    it('자리비움 임계를 넘으면 사라진 시점에 마감하고 그 뒤는 세지 않는다', () => {
      const c = clock()
        .run(40 * SECOND)
        .run(2 * MINUTE, { face: false })
      expect(c.segments).toHaveLength(1)
      expect(c.segments[0].durationSec).toBe(40)
    })

    it('돌아오면 새 구간이 시작된다', () => {
      const c = clock()
        .run(40 * SECOND)
        .run(2 * MINUTE, { face: false })
        .run(70 * SECOND)
      expect(c.segments).toHaveLength(2)
      expect(c.segments[0].durationSec).toBe(40)
      expect(c.segments[1].durationSec).toBe(60)
      // 자리를 비운 2분은 빠진다
      expect(Date.parse(c.segments[1].startedAt) - Date.parse(c.segments[0].endedAt)).toBe(
        2 * MINUTE
      )
    })

    it('자리를 비운 채로 멈추면 사라진 시점까지만 센다', () => {
      const c = clock()
        .run(40 * SECOND)
        .run(45 * SECOND, { face: false })
        .flush()
      expect(total(c.segments)).toBe(40)
    })
  })

  describe('KST 자정', () => {
    it('자정에서 구간을 나눈다', () => {
      const tracker = new UsageTracker()
      const c = new Clock(tracker)
      c.now = Date.parse('2026-10-27T23:59:30+09:00')
      c.run(60 * SECOND)
      expect(c.segments).toHaveLength(1)
      expect(c.segments[0].endedAt).toBe('2026-10-28T00:00:00+09:00')
      expect(c.segments[0].durationSec).toBe(30)
    })

    it('마감할 때 자정을 넘었다면 거기서도 나눈다', () => {
      const c = new Clock(new UsageTracker())
      c.now = Date.parse('2026-10-27T23:59:40+09:00')
      c.run(20 * SECOND, { bad: true }) // 자정 넘김
      c.run(10 * SECOND, { bad: true })
      c.flush()
      expect(c.segments).toHaveLength(2)
      expect(c.segments[0].endedAt).toBe('2026-10-28T00:00:00+09:00')
      expect(c.segments[1].startedAt).toBe('2026-10-28T00:00:00+09:00')
      expect(total(c.segments)).toBe(30)
      expect(totalBad(c.segments)).toBe(30)
    })

    it('모든 구간은 같은 KST 날짜 안에 있다 (자정 종료는 허용)', () => {
      const c = new Clock(new UsageTracker())
      c.now = Date.parse('2026-10-27T23:58:00+09:00')
      c.run(5 * MINUTE).flush()
      for (const s of c.segments) {
        const sameDay = s.startedAt.slice(0, 10) === s.endedAt.slice(0, 10)
        const endsAtMidnight = s.endedAt.endsWith('T00:00:00+09:00')
        expect(sameDay || endsAtMidnight).toBe(true)
      }
    })
  })

  describe('시계가 튀는 경우', () => {
    it('절전에서 깨어난 시간은 사용 시간에 들어가지 않는다', () => {
      const tracker = new UsageTracker()
      let now = START
      const segments: UsageSegment[] = []
      segments.push(...tracker.update(now, { face: true, bad: false }))
      for (let i = 0; i < 40; i++) {
        now += SECOND
        segments.push(...tracker.update(now, { face: true, bad: false }))
      }
      // 3시간 뒤에 깨어남
      now += 3 * 60 * MINUTE
      segments.push(...tracker.update(now, { face: true, bad: false }))
      segments.push(...tracker.flush(now))
      expect(total(segments)).toBe(40)
    })
  })

  describe('서버 검증 규칙', () => {
    it('만들어진 구간은 모두 서버 스키마를 통과한다', () => {
      const c = clock()
        .run(2 * MINUTE, { bad: true })
        .run(30 * SECOND, { face: false })
        .run(3 * MINUTE)
        .flush()
      expect(c.segments.length).toBeGreaterThan(0)
      const now = new Date(c.now)
      for (const s of c.segments) {
        expect(validateEvent(asEvent(s), now)).toEqual({
          ok: true,
          event: expect.objectContaining({ type: 'USAGE_SEGMENT' })
        })
      }
    })

    it('1 ~ 3600초, bad <= duration 을 지킨다', () => {
      const c = clock(5 * SECOND)
        .run(10 * MINUTE, { bad: true })
        .flush()
      for (const s of c.segments) {
        expect(s.durationSec).toBeGreaterThanOrEqual(1)
        expect(s.durationSec).toBeLessThanOrEqual(3600)
        expect(s.badDurationSec).toBeGreaterThanOrEqual(0)
        expect(s.badDurationSec).toBeLessThanOrEqual(s.durationSec)
      }
    })

    it('occurredAt 으로 쓸 endedAt 이 초 단위로 떨어진다', () => {
      const c = new Clock(new UsageTracker(), 700)
      c.now = START + 123 // 어중간한 시각에서 시작
      c.run(90 * SECOND).flush()
      for (const s of c.segments) {
        expect(s.startedAt).toMatch(/:\d{2}\+09:00$/)
        expect(Date.parse(s.endedAt) % SECOND).toBe(0)
      }
    })
  })

  it('사용 시간의 합이 실제 지난 시간과 맞는다', () => {
    const c = clock()
      .run(7 * MINUTE + 23 * SECOND)
      .flush()
    expect(total(c.segments)).toBe(7 * 60 + 23)
    expect(c.segments.at(-1)?.endedAt).toBe(toKstIso(new Date(c.now)))
  })
})
