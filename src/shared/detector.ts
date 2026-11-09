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

/**
 * - start: 사용자가 '자세 감지 시작' 을 눌렀다 → 감지 세션 (경과 시간·사용 구간·이벤트)
 * - camera: 온보딩·기준 잡기용으로 카메라만 켠다 → 세션은 시작하지 않는다
 * - stop: 끈다
 */
export type DetectorCommand = 'start' | 'camera' | 'stop'

export function isDetectorCommand(value: unknown): value is DetectorCommand {
  return value === 'start' || value === 'camera' || value === 'stop'
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

/** 얼굴 위에 찍는 점 (BlazeFace 키포인트 6개와 네모). 좌표는 0~1 비율 */
export interface FaceMarks {
  box: { x: number; y: number; width: number; height: number }
  keypoints: { x: number; y: number }[]
  /** 기준을 잡을 수 있는 상태인가 (점이 모두 보이고 각도를 낼 수 있다) */
  ok: boolean
}

/** 온보딩 프리뷰 한 장 */
export interface PreviewFrame {
  /** data:image/jpeg;base64,… */
  frame: string
  face: FaceMarks | null
}

/** 기준 잡기 진행 상태 */
export type CalibrationPhase = CalibrationResult | { phase: 'idle' }

/** 자세 감지기. 구현을 갈아끼울 수 있도록 이 모양만 지킨다. */
export interface PostureDetector {
  start: () => Promise<void>
  stop: () => void
  /** 설정에 저장된 기준 자세. 없으면 판정하지 않고 샘플만 낸다 */
  setBaseline: (baseline: Baseline | null) => void
  /**
   * 지금 자세를 기준으로 저장한다 (버튼을 누른 순간).
   * 한 프레임이 아니라 엔진이 1초 EMA 로 평활한 값이라 떨림에 덜 흔들린다.
   */
  calibrate: () => void
  /** 온보딩에서만 켠다. 프레임과 얼굴 점을 내보낸다 (기기 밖으로 나가지 않는다) */
  setPreview: (on: boolean) => void
  onPreview: (listener: (preview: PreviewFrame) => void) => () => void
  onUpdate: (listener: (update: DetectionUpdate) => void) => () => void
  onCalibration: (listener: (phase: CalibrationPhase) => void) => () => void
  onStatus: (listener: (status: DetectorStatus) => void) => () => void
}
