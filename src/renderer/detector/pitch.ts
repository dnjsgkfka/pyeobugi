import type { Matrix } from '@mediapipe/tasks-vision'

/**
 * 얼굴 변환 행렬(4x4, column-major)에서 pitch(도)를 꺼낸다.
 * 부호: **고개를 숙이면 양수**, 들면 음수. (화면 좌표계가 아래로 +y 라서 부호를 뒤집는다)
 */
export function pitchFromMatrix(matrix: Matrix): number {
  const m = matrix.data
  // column-major 에서 (row, col) = data[col * 4 + row]
  // R = Rz·Ry·Rx 일 때 r32 = sin(pitch)·cos(yaw), r33 = cos(pitch)·cos(yaw)
  // → atan2(r32, r33) 는 yaw·roll 과 무관하게 pitch 를 준다
  const r32 = m[6]
  const r33 = m[10]
  return (Math.atan2(r32, r33) * 180) / Math.PI
}

/** 얼굴 크기 = 눈~턱 세로 길이를 화면 높이로 나눈 값 (0~1). 가까울수록 커진다. */
export function sizeFromLandmarks(landmarks: { x: number; y: number }[]): number {
  const forehead = landmarks[10]
  const chin = landmarks[152]
  if (!forehead || !chin) return 0
  return Math.hypot(chin.x - forehead.x, chin.y - forehead.y)
}

/** 최근 n개의 이동평균. 값이 덜 찼으면 있는 만큼으로 평균을 낸다. */
export class MovingAverage {
  private readonly values: number[] = []

  constructor(private readonly size: number) {}

  push(value: number): number {
    this.values.push(value)
    if (this.values.length > this.size) this.values.shift()
    return this.value
  }

  get value(): number {
    if (this.values.length === 0) return 0
    return this.values.reduce((a, b) => a + b, 0) / this.values.length
  }

  get filled(): boolean {
    return this.values.length >= this.size
  }

  reset(): void {
    this.values.length = 0
  }
}
