import { z } from 'zod'

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

/** 자세 감지기. MediaPipe 가 마음에 안 들면 같은 모양으로 다른 구현을 끼운다. */
export interface PostureDetector {
  start: () => Promise<void>
  stop: () => void
  onSample: (listener: (sample: PostureSample) => void) => () => void
  onStatus: (listener: (status: DetectorStatus) => void) => () => void
}
