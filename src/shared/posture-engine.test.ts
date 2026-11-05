import { describe, expect, it } from 'vitest'
import type { Baseline } from './calibration'
import type { PostureSample } from './detector'
import { PostureEngine, type PostureResult } from './posture-engine'
import { PRESETS, deviationFrom, severityOf, type PostureThresholds } from './posture'

const BASELINE: Baseline = { pitch: 0, size: 0.4 }
const T: PostureThresholds = PRESETS[1]
const STEP = 1000 / 15

function engine(): PostureEngine {
  return new PostureEngine(BASELINE, T)
}

/** ms 만큼 15fps 로 샘플을 흘려보내고, 그동안의 결과를 모은다 */
function feed(
  e: PostureEngine,
  ms: number,
  options: { from?: number; pitch?: number; size?: number; face?: boolean } = {}
): { results: PostureResult[]; until: number } {
  const { from = 0, pitch = 0, size = BASELINE.size, face = true } = options
  const results: PostureResult[] = []
  let t = from
  for (; t < from + ms; t += STEP) {
    const sample: PostureSample = face
      ? { t, face: true, pitch, size }
      : { t, face: false, pitch: null, size: null }
    results.push(e.push(sample))
  }
  return { results, until: t }
}

const badEvents = (results: PostureResult[]): string[] =>
  results.filter((r) => r.enteredBad).map((r) => r.enteredBad as string)

/** 기준보다 많이 숙인 자세 */
const SLOUCH = { pitch: T.pitchDeltaDeg + 3 }

describe('PostureEngine', () => {
  it('바른 자세는 계속 good', () => {
    const { results } = feed(engine(), 10_000)
    expect(results.every((r) => r.state === 'good')).toBe(true)
    expect(badEvents(results)).toEqual([])
  })

  it('기준을 살짝 넘겨도 3초 전에는 확정하지 않는다', () => {
    const e = engine()
    const { results } = feed(e, 2_500, SLOUCH)
    expect(e.value).toBe('slipping')
    expect(badEvents(results)).toEqual([])
    expect(results.at(-1)?.progress).toBeGreaterThan(0.7)
  })

  it('3초 이상 숙이면 POSTURE_BAD 가 한 번 발생한다', () => {
    const e = engine()
    const { results } = feed(e, 4_000, SLOUCH)
    expect(badEvents(results)).toHaveLength(1)
    expect(e.value).toBe('bad')
  })

  it('계속 숙이고 있어도 횟수가 늘지 않는다', () => {
    const e = engine()
    const { results } = feed(e, 60_000, SLOUCH)
    expect(badEvents(results)).toHaveLength(1)
  })

  it('잠깐 폈다가 다시 숙이면 복귀 전이라 새로 세지 않는다', () => {
    const e = engine()
    const a = feed(e, 4_000, SLOUCH)
    const b = feed(e, 1_000, { from: a.until }) // 복귀 2초를 채우지 못함
    const c = feed(e, 4_000, { ...SLOUCH, from: b.until })
    expect(badEvents([...a.results, ...b.results, ...c.results])).toHaveLength(1)
  })

  it('복귀한 뒤 다시 나빠지면 다시 한 번 발생한다', () => {
    const e = engine()
    const a = feed(e, 4_000, SLOUCH)
    const b = feed(e, 2_500, { from: a.until })
    expect(e.value).toBe('good')
    const c = feed(e, 4_000, { ...SLOUCH, from: b.until })
    expect(badEvents([...a.results, ...b.results, ...c.results])).toHaveLength(2)
  })

  it('기준을 넘었다 말았다 하면 시계가 다시 시작된다', () => {
    const e = engine()
    let t = 0
    for (let i = 0; i < 20; i++) {
      t = feed(e, 2_000, { ...SLOUCH, from: t }).until
      t = feed(e, 200, { from: t }).until
    }
    expect(e.value).not.toBe('bad')
  })

  describe('얼굴 미검출', () => {
    it('안 보이면 away 이고 나쁜 자세로 세지 않는다', () => {
      const e = engine()
      const { results } = feed(e, 10_000, { face: false })
      expect(e.value).toBe('away')
      expect(badEvents(results)).toEqual([])
    })

    it('숙인 채 자리를 비우면 쌓이던 시간이 없어진다', () => {
      const e = engine()
      const a = feed(e, 2_500, SLOUCH) // 확정 직전
      const b = feed(e, 1_000, { from: a.until, face: false })
      const c = feed(e, 1_000, { ...SLOUCH, from: b.until }) // 돌아와서 1초만 숙임
      expect(badEvents([...a.results, ...b.results, ...c.results])).toEqual([])
      expect(e.value).toBe('slipping')
    })

    it('돌아온 뒤 3초를 채우면 그때 발생한다', () => {
      const e = engine()
      const a = feed(e, 2_000, SLOUCH)
      const b = feed(e, 1_000, { from: a.until, face: false })
      const c = feed(e, 4_000, { ...SLOUCH, from: b.until })
      expect(badEvents([...a.results, ...b.results, ...c.results])).toHaveLength(1)
    })

    it('나쁜 자세 중에 자리를 비우면 상태가 비워진다', () => {
      const e = engine()
      const a = feed(e, 4_000, SLOUCH)
      const b = feed(e, 500, { from: a.until, face: false })
      expect(e.value).toBe('away')
      // 돌아와서 다시 3초를 숙이면 새로 한 번
      const c = feed(e, 4_000, { ...SLOUCH, from: b.until })
      expect(badEvents([...a.results, ...b.results, ...c.results])).toHaveLength(2)
    })
  })

  describe('severity', () => {
    it('조금 넘으면 MILD, 많이 넘으면 SEVERE', () => {
      const mild = feed(engine(), 4_000, { pitch: T.pitchDeltaDeg * 1.1 })
      const moderate = feed(engine(), 4_000, { pitch: T.pitchDeltaDeg * T.moderateFactor })
      const severe = feed(engine(), 4_000, { pitch: T.pitchDeltaDeg * T.severeFactor })
      expect(badEvents(mild.results)).toEqual(['MILD'])
      expect(badEvents(moderate.results)).toEqual(['MODERATE'])
      expect(badEvents(severe.results)).toEqual(['SEVERE'])
    })

    it('재는 동안 가장 심했던 정도로 매긴다', () => {
      const e = engine()
      const a = feed(e, 1_000, { pitch: T.pitchDeltaDeg * T.severeFactor })
      const b = feed(e, 3_000, { ...SLOUCH, from: a.until })
      expect(badEvents([...a.results, ...b.results])).toEqual(['SEVERE'])
    })
  })

  describe('얼굴이 가까워지는 경우', () => {
    it('고개를 숙이지 않아도 화면에 가까워지면 잡힌다', () => {
      const e = engine()
      const { results } = feed(e, 4_000, { size: BASELINE.size * (T.sizeRatio + 0.05) })
      expect(badEvents(results)).toHaveLength(1)
    })

    it('기준 배율 안쪽이면 괜찮다', () => {
      const e = engine()
      const { results } = feed(e, 10_000, { size: BASELINE.size * (T.sizeRatio - 0.03) })
      expect(badEvents(results)).toEqual([])
    })
  })

  describe('민감도 프리셋', () => {
    it('엄격할수록 더 작은 각도에서 잡힌다', () => {
      expect(PRESETS[2].pitchDeltaDeg).toBeLessThan(PRESETS[1].pitchDeltaDeg)
      expect(PRESETS[1].pitchDeltaDeg).toBeLessThan(PRESETS[0].pitchDeltaDeg)
    })

    it('같은 자세라도 프리셋에 따라 결과가 다르다', () => {
      const pitch = (PRESETS[2].pitchDeltaDeg + PRESETS[1].pitchDeltaDeg) / 2
      const strict = new PostureEngine(BASELINE, PRESETS[2])
      const loose = new PostureEngine(BASELINE, PRESETS[0])
      expect(badEvents(feed(strict, 4_000, { pitch }).results)).toHaveLength(1)
      expect(badEvents(feed(loose, 4_000, { pitch }).results)).toEqual([])
    })

    it('configure 로 바꾸면 판정이 처음부터 다시 시작된다', () => {
      const e = engine()
      feed(e, 2_500, SLOUCH)
      e.configure(BASELINE, PRESETS[0])
      expect(e.value).toBe('good')
    })
  })
})

describe('깜빡임 방지 (진입과 복귀 기준이 다름)', () => {
  it('기준선 바로 아래로 내려온 정도로는 복귀하지 않는다', () => {
    const e = engine()
    const a = feed(e, 4_000, SLOUCH)
    // score 가 0.9 쯤 — 진입 기준(1.0)은 밑이지만 복귀 기준(0.8)보다는 위
    const b = feed(e, 5_000, { from: a.until, pitch: T.pitchDeltaDeg * 0.9 })
    expect(e.value).toBe('bad')
    expect(badEvents([...a.results, ...b.results])).toHaveLength(1)
  })

  it('복귀 기준 아래로 내려오면 복귀한다', () => {
    const e = engine()
    const a = feed(e, 4_000, SLOUCH)
    feed(e, 2_500, { from: a.until, pitch: T.pitchDeltaDeg * 0.7 })
    expect(e.value).toBe('good')
  })

  it('기준선 근처에서 흔들려도 상태가 깜빡이지 않는다', () => {
    const e = engine()
    let t = feed(e, 4_000, SLOUCH).until
    const states: string[] = []
    for (let i = 0; i < 30; i++) {
      const pitch = T.pitchDeltaDeg * (i % 2 === 0 ? 1.05 : 0.9)
      const r = feed(e, 300, { from: t, pitch })
      t = r.until
      states.push(...r.results.map((x) => x.state))
    }
    expect(new Set(states)).toEqual(new Set(['bad']))
  })
})

describe('deviationFrom', () => {
  it('기준점에서 정확히 1 이다', () => {
    const d = deviationFrom(BASELINE, T.pitchDeltaDeg, BASELINE.size, T)
    expect(d.score).toBeCloseTo(1, 5)
  })

  it('더 많이 벗어난 쪽을 쓴다', () => {
    const d = deviationFrom(BASELINE, T.pitchDeltaDeg * 2, BASELINE.size, T)
    expect(d.score).toBeCloseTo(2, 5)
    expect(d.pitchOver).toBeGreaterThan(d.sizeOver)
  })

  it('기준 자세의 pitch 가 0 이 아니어도 상대값으로 본다', () => {
    const tilted: Baseline = { pitch: 12, size: 0.4 }
    const d = deviationFrom(tilted, 12 + T.pitchDeltaDeg, 0.4, T)
    expect(d.score).toBeCloseTo(1, 5)
  })
})

describe('severityOf', () => {
  it('경계값', () => {
    expect(severityOf(1, T)).toBe('MILD')
    expect(severityOf(T.moderateFactor, T)).toBe('MODERATE')
    expect(severityOf(T.severeFactor, T)).toBe('SEVERE')
  })
})

describe('나쁜 자세 시작 시각', () => {
  it('확정된 순간에 badSince 로 시작 시각을 돌려준다 (판정 시각이 아니다)', () => {
    const { results } = feed(engine(), 5_000, SLOUCH)
    const index = results.findIndex((r) => r.enteredBad)
    expect(index).toBeGreaterThan(0)
    const entered = results[index]
    expect(entered.badSince).not.toBeNull()
    // 확정 시각 - 시작 시각 ≈ holdMs (샘플 한 칸 오차 허용)
    expect(index * STEP - (entered.badSince as number)).toBeGreaterThanOrEqual(T.holdMs - STEP)
  })

  it('확정 이후 샘플에는 badSince 가 없다', () => {
    const { results } = feed(engine(), 8_000, SLOUCH)
    const after = results.slice(results.findIndex((r) => r.enteredBad) + 1)
    expect(after.every((r) => r.badSince === null)).toBe(true)
  })
})
