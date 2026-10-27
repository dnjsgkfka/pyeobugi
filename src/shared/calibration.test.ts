import { describe, expect, it } from 'vitest'
import { CalibrationCollector, FaceTracker, MIN_SAMPLES } from './calibration'
import type { PostureSample } from './detector'

function sample(t: number, face: boolean, pitch = 5, size = 0.4): PostureSample {
  return face ? { t, face, pitch, size } : { t, face, pitch: null, size: null }
}

/** 15fps 로 ms 만큼 샘플을 흘려보낸다 */
function feed(
  target: { push: (s: PostureSample) => unknown },
  ms: number,
  face = true,
  options: { from?: number; pitch?: number; size?: number } = {}
): number {
  const step = 1000 / 15
  const from = options.from ?? 0
  let t = from
  for (; t < from + ms; t += step) {
    target.push(sample(t, face, options.pitch, options.size))
  }
  return t
}

describe('FaceTracker', () => {
  it('처음에는 searching', () => {
    expect(new FaceTracker().value).toBe('searching')
  })

  it('3프레임 연속 보여야 found', () => {
    const tracker = new FaceTracker()
    expect(tracker.push(sample(0, true))).toBe('searching')
    expect(tracker.push(sample(1, true))).toBe('searching')
    expect(tracker.push(sample(2, true))).toBe('found')
  })

  it('한두 프레임 놓친 건 무시한다', () => {
    const tracker = new FaceTracker()
    feed(tracker, 500)
    expect(tracker.value).toBe('found')
    tracker.push(sample(100, false))
    tracker.push(sample(101, false))
    expect(tracker.value).toBe('found')
  })

  it('8프레임 연속 안 보이면 lost', () => {
    const tracker = new FaceTracker()
    feed(tracker, 500)
    for (let i = 0; i < 8; i++) tracker.push(sample(200 + i, false))
    expect(tracker.value).toBe('lost')
  })

  it('놓치다 다시 보이면 끊긴 횟수가 초기화된다', () => {
    const tracker = new FaceTracker()
    feed(tracker, 500)
    for (let i = 0; i < 7; i++) tracker.push(sample(200 + i, false))
    tracker.push(sample(300, true))
    for (let i = 0; i < 7; i++) tracker.push(sample(400 + i, false))
    expect(tracker.value).toBe('found')
  })

  it('lost 에서 다시 found 로 돌아온다', () => {
    const tracker = new FaceTracker()
    feed(tracker, 500)
    feed(tracker, 1000, false, { from: 1000 })
    expect(tracker.value).toBe('lost')
    feed(tracker, 500, true, { from: 3000 })
    expect(tracker.value).toBe('found')
  })
})

describe('CalibrationCollector', () => {
  it('얼굴이 안 잡히면 계속 기다린다 (실패가 아니다)', () => {
    const collector = new CalibrationCollector()
    feed(collector, 5000, false)
    expect(collector.value).toEqual({ phase: 'waiting' })
  })

  it('재는 동안 진행률이 올라간다', () => {
    const collector = new CalibrationCollector()
    feed(collector, 1500)
    const state = collector.value
    expect(state.phase).toBe('measuring')
    if (state.phase === 'measuring') {
      expect(state.progress).toBeGreaterThan(0.2)
      expect(state.progress).toBeLessThan(1)
    }
  })

  it('3초가 지나면 평균을 기준으로 저장한다', () => {
    const collector = new CalibrationCollector()
    feed(collector, 3500, true, { pitch: 10, size: 0.5 })
    const state = collector.value
    expect(state.phase).toBe('done')
    if (state.phase === 'done') {
      expect(state.baseline.pitch).toBeCloseTo(10, 5)
      expect(state.baseline.size).toBeCloseTo(0.5, 5)
    }
  })

  it('평균이라서 튀는 값 하나에 끌려가지 않는다', () => {
    const collector = new CalibrationCollector()
    let t = 0
    for (let i = 0; i < 60; i++) {
      collector.push(sample(t, true, i === 10 ? 80 : 10, 0.5))
      t += 1000 / 15
    }
    collector.push(sample(4000, true, 10, 0.5))
    const state = collector.value
    if (state.phase !== 'done') throw new Error('done 이 아님')
    expect(state.baseline.pitch).toBeLessThan(13)
  })

  it('재는 중에 얼굴이 사라지면 실패한다', () => {
    const collector = new CalibrationCollector()
    const t = feed(collector, 1000)
    feed(collector, 1000, false, { from: t })
    expect(collector.value).toEqual({ phase: 'failed', reason: 'face-lost' })
  })

  it('실패한 뒤에는 샘플을 넣어도 그대로다', () => {
    const collector = new CalibrationCollector()
    const t = feed(collector, 1000)
    feed(collector, 1000, false, { from: t })
    feed(collector, 5000, true, { from: 10_000 })
    expect(collector.value).toEqual({ phase: 'failed', reason: 'face-lost' })
  })

  it('reset 하면 다시 시도할 수 있다', () => {
    const collector = new CalibrationCollector()
    const t = feed(collector, 1000)
    feed(collector, 1000, false, { from: t })
    collector.reset()
    expect(collector.value).toEqual({ phase: 'waiting' })
    feed(collector, 3500, true, { from: 20_000, pitch: 7, size: 0.3 })
    const state = collector.value
    expect(state.phase).toBe('done')
    if (state.phase === 'done') expect(state.baseline.pitch).toBeCloseTo(7, 5)
  })

  it('샘플이 너무 적으면 (끊긴 프레임이 많으면) 실패한다', () => {
    const collector = new CalibrationCollector()
    // 3초를 넘기지만 샘플은 몇 개뿐인 경우
    collector.push(sample(0, true))
    collector.push(sample(1, true))
    collector.push(sample(2, true))
    collector.push(sample(3100, true))
    expect(collector.value).toEqual({ phase: 'failed', reason: 'not-enough-samples' })
    expect(MIN_SAMPLES).toBeGreaterThan(4)
  })

  it('완료된 뒤에는 상태가 바뀌지 않는다', () => {
    const collector = new CalibrationCollector()
    feed(collector, 3500)
    const done = collector.value
    feed(collector, 2000, false, { from: 10_000 })
    expect(collector.value).toBe(done)
  })
})
