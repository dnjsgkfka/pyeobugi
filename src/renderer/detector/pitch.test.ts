import { describe, expect, it } from 'vitest'
import { MovingAverage, pitchFromMatrix, sizeFromLandmarks } from './pitch'

/** x축 회전 행렬 (column-major 4x4). angle 은 라디안. */
function rotateX(angle: number): { rows: number; columns: number; data: number[] } {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  // column-major: [col0, col1, col2, col3]
  return {
    rows: 4,
    columns: 4,
    data: [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]
  }
}

/** column-major 4x4 곱셈 (a 를 먼저, b 를 나중에 적용) */
function multiply(
  a: { data: number[] },
  b: { data: number[] }
): { rows: number; columns: number; data: number[] } {
  const data = new Array<number>(16).fill(0)
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0
      for (let k = 0; k < 4; k++) sum += a.data[k * 4 + row] * b.data[col * 4 + k]
      data[col * 4 + row] = sum
    }
  }
  return { rows: 4, columns: 4, data }
}

describe('pitchFromMatrix', () => {
  it('정면이면 0도에 가깝다', () => {
    expect(pitchFromMatrix(rotateX(0))).toBeCloseTo(0, 5)
  })

  it('고개를 숙이면 양수, 들면 음수', () => {
    expect(pitchFromMatrix(rotateX(0.3))).toBeGreaterThan(0)
    expect(pitchFromMatrix(rotateX(-0.3))).toBeLessThan(0)
  })

  it('각도가 커질수록 값도 커진다', () => {
    const small = pitchFromMatrix(rotateX(0.1))
    const large = pitchFromMatrix(rotateX(0.4))
    expect(large).toBeGreaterThan(small)
    expect(large).toBeCloseTo(22.9, 0)
  })

  it('좌우로 돌아봐도(yaw) pitch 값은 그대로다', () => {
    const yaw = 0.5
    const c = Math.cos(yaw)
    const s = Math.sin(yaw)
    const rotateY = { rows: 4, columns: 4, data: [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1] }
    const pitched = rotateX(0.3)
    expect(pitchFromMatrix(multiply(rotateY, pitched))).toBeCloseTo(pitchFromMatrix(pitched), 4)
  })
})

describe('sizeFromLandmarks', () => {
  const at = (y: number): { x: number; y: number } => ({ x: 0.5, y })

  it('이마와 턱이 멀수록 크다 (가까이 올수록 커짐)', () => {
    const near: { x: number; y: number }[] = []
    near[10] = at(0.2)
    near[152] = at(0.8)
    const far: { x: number; y: number }[] = []
    far[10] = at(0.45)
    far[152] = at(0.55)
    expect(sizeFromLandmarks(near)).toBeCloseTo(0.6, 5)
    expect(sizeFromLandmarks(far)).toBeCloseTo(0.1, 5)
    expect(sizeFromLandmarks(near)).toBeGreaterThan(sizeFromLandmarks(far))
  })

  it('랜드마크가 없으면 0', () => {
    expect(sizeFromLandmarks([])).toBe(0)
  })
})

describe('MovingAverage', () => {
  it('최근 5개만 평균낸다', () => {
    const avg = new MovingAverage(5)
    ;[10, 20, 30, 40, 50].forEach((v) => avg.push(v))
    expect(avg.value).toBe(30)
    expect(avg.filled).toBe(true)
    avg.push(60) // 10 이 빠진다
    expect(avg.value).toBe(40)
  })

  it('덜 찼으면 있는 만큼 평균낸다', () => {
    const avg = new MovingAverage(5)
    avg.push(10)
    avg.push(20)
    expect(avg.value).toBe(15)
    expect(avg.filled).toBe(false)
  })

  it('튀는 값 하나의 영향이 줄어든다', () => {
    const avg = new MovingAverage(5)
    ;[10, 10, 10, 10].forEach((v) => avg.push(v))
    expect(avg.push(60)).toBe(20) // 60 이 그대로 나오지 않는다
  })

  it('reset 하면 0', () => {
    const avg = new MovingAverage(5)
    avg.push(10)
    avg.reset()
    expect(avg.value).toBe(0)
  })
})
