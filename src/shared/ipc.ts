import type { Baseline } from './calibration'
import type { DetectorCommand, DetectorStatus, PostureSample } from './detector'
import type { PostureResult } from './posture-engine'
import type { Settings } from './schemas/settings'

/** main / preload / renderer 가 함께 쓰는 IPC 채널과 타입. 채널 문자열은 여기서만 정의한다. */

export const WINDOW_NAMES = ['app', 'detector', 'overlay'] as const
export type WindowName = (typeof WINDOW_NAMES)[number]

export function isWindowName(value: unknown): value is WindowName {
  return typeof value === 'string' && (WINDOW_NAMES as readonly string[]).includes(value)
}

export const IPC = {
  APP_QUIT: 'app:quit',
  WINDOW_SHOW: 'window:show',
  WINDOW_HIDE: 'window:hide',
  /** app → main → detector: 시작/정지 명령 */
  DETECTOR_COMMAND: 'detector:command',
  /** detector → main → app: 상태 변경 */
  DETECTOR_STATUS: 'detector:status',
  DETECTOR_GET_STATUS: 'detector:get-status',
  /** detector → main → app: 자세 샘플 (서버로 보내지 않음) */
  POSTURE_SAMPLE: 'posture:sample',
  CAMERA_OPEN_SETTINGS: 'camera:open-settings',
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
  /** 기준 자세 저장 + CALIBRATION_COMPLETED 이벤트 */
  CALIBRATION_SAVE: 'calibration:save',
  /** main → app/overlay: 판정 결과 (good / slipping / bad / away) */
  POSTURE_STATE: 'posture:state'
} as const

/** preload 가 renderer 에 노출하는 `window.api` 의 모양 */
export interface PreloadApi {
  app: {
    quit: () => void
  }
  window: {
    show: (name: WindowName) => void
    hide: (name: WindowName) => void
  }
  camera: {
    /** Windows 설정 > 개인정보 > 카메라를 연다 */
    openSettings: () => void
  }
  settings: {
    get: () => Promise<Settings>
    update: (patch: Partial<Settings>) => Promise<Settings>
    /** 기준 자세를 저장하고 온보딩을 끝낸 것으로 표시한다 */
    saveCalibration: (baseline: Baseline, isRecalibration: boolean) => Promise<Settings>
  }
  posture: {
    /** app → detector: 감지 시작/정지 */
    start: () => void
    stop: () => void
    getStatus: () => Promise<DetectorStatus>
    /** app 쪽 구독 (해제 함수를 돌려준다) */
    onSample: (listener: (sample: PostureSample) => void) => () => void
    onStatus: (listener: (status: DetectorStatus) => void) => () => void
    /** 자세 판정 결과 구독 */
    onState: (listener: (result: PostureResult) => void) => () => void
    /** detector 쪽 */
    onCommand: (listener: (command: DetectorCommand) => void) => () => void
    sendSample: (sample: PostureSample) => void
    sendStatus: (status: DetectorStatus) => void
  }
}
