import { z } from 'zod'
import type { CalibrationResult } from './ai/calibration'
import type { DistanceState } from './ai/distance'
import type { Transition } from './ai/engine'
import type { PostureFeedback } from './ai/feedback'
import type { Baseline } from './ai/score'

/** detector 창 → main → app 창으로 오가는 자세 샘플. 서버로는 절대 보내지 않는다. */
export const PostureSampleSchema = z.strictObject({
  /** performance.now() 기준 ms */
  t: z.number(),
  face: z.boolean(),
  /** 도(°), 5프레임 이동평균. 얼굴이 없으면 null */
  pitch: z.number().nullable(),
  /** 얼굴 크기(화면 대비 0~1), 5프레임 이동평균. 얼굴이 없으면 null */
  size: z.number().nullable()
})
export type PostureSample = z.infer<typeof PostureSampleSchema>

export const DETECTOR_STATUSES = [
  'idle',
  'starting',
  'running',
  /** 카메라 권한 거부 (Windows 개인정보 설정에서 꺼진 경우 포함) */
  'denied',
  'no-camera',
  /** 그 밖의 오류 (다른 앱이 카메라 사용 중, 모델 로드 실패 등) */
  'error'
] as const
export type DetectorStatus = (typeof DETECTOR_STATUSES)[number]

export function isDetectorStatus(value: unknown): value is DetectorStatus {
  return typeof value === 'string' && (DETECTOR_STATUSES as readonly string[]).includes(value)
}

export type DetectorCommand = 'start' | 'stop'

export function isDetectorCommand(value: unknown): value is DetectorCommand {
  return value === 'start' || value === 'stop'
}

/** detector 창이 한 번 추론하고 내보내는 묶음 */
export interface DetectionUpdate {
  /** 디버그·개발 화면용 원시 샘플 (서버로 보내지 않는다) */
  sample: PostureSample
  feedback: PostureFeedback
  distance: DistanceState
  /** main 이 이벤트로 바꾼다 (BAD_ENTER → POSTURE_BAD, PRESENCE_* → 사용 구간) */
  transitions: Transition[]
  /** 다음 추론까지의 간격 (적응형: 평소 1초 / 바뀌는 중 0.25초 / 자리비움 3초) */
  intervalMs: number
}

/** 기준 잡기 진행 상태 */
export type CalibrationPhase = CalibrationResult | { phase: 'idle' }

/** 자세 감지기. 구현을 갈아끼울 수 있도록 이 모양만 지킨다. */
export interface PostureDetector {
  start: () => Promise<void>
  stop: () => void
  /** 설정에 저장된 기준 자세. 없으면 판정하지 않고 샘플만 낸다 */
  setBaseline: (baseline: Baseline | null) => void
  /** 기준 잡기 시작 (5초 수집) */
  calibrate: () => void
  onUpdate: (listener: (update: DetectionUpdate) => void) => () => void
  onCalibration: (listener: (phase: CalibrationPhase) => void) => () => void
  onStatus: (listener: (status: DetectorStatus) => void) => () => void
}
