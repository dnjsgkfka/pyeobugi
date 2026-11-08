import type { Baseline } from './calibration'
import type { PostureFeedback } from './ai/feedback'
import type { BubbleType } from './bubble'
import type { DistanceState } from './ai/distance'
import type {
  CalibrationPhase,
  DetectionUpdate,
  DetectorCommand,
  DetectorStatus,
  PostureSample
} from './detector'
import type { PomodoroState } from './pomodoro'

/** main → app/overlay: 지금 자세 상태 (AI 모듈의 feedback + 거리 변화 안내) */
export interface PostureView {
  feedback: PostureFeedback
  distance: DistanceState
}

/** 감지가 돌아간 시간 */
export interface DetectionState {
  running: boolean
  elapsedMs: number
}
import type { ReportView } from './report'
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
  /** detector → main: 추론 결과 묶음 (판정 상태 + 전이) */
  POSTURE_UPDATE: 'posture:update',
  /** app → main → detector: 기준 잡기 시작 */
  CALIBRATION_START: 'calibration:start',
  /** detector → main → app: 기준 잡기 진행 상태 */
  CALIBRATION_STATE: 'calibration:state',
  /** app → main → detector: 온보딩 프리뷰 켜기/끄기 */
  PREVIEW_SET: 'preview:set',
  /** detector → main → app: 축소한 카메라 프레임 (기기 안에서만 돈다) */
  PREVIEW_FRAME: 'preview:frame',
  CAMERA_OPEN_SETTINGS: 'camera:open-settings',
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
  /** 기준 자세 저장 + CALIBRATION_COMPLETED 이벤트 */
  CALIBRATION_SAVE: 'calibration:save',
  /** main → app/overlay: 판정 상태 (feedback + 거리 변화 안내) */
  POSTURE_STATE: 'posture:state',
  /** 감지 경과 시간 */
  DETECTION_STATE: 'detection:state',
  DETECTION_GET: 'detection:get',
  DETECTION_RESET: 'detection:reset',
  /** 카메라만 끄기 (감지 중이면 무시) */
  DETECTOR_CLOSE_IF_IDLE: 'detector:close-if-idle',
  /** overlay → main: 말풍선을 띄웠다 (BUBBLE_SHOWN 이벤트 적재) */
  BUBBLE_SHOWN: 'bubble:shown',
  /** overlay → main: 눌러야 하는 말풍선이 떠 있는 동안만 클릭을 받는다 */
  OVERLAY_CLICKABLE: 'overlay:clickable',
  /** overlay → main → app: 기준 다시 잡기로 보내기 */
  OVERLAY_RECALIBRATE: 'overlay:recalibrate',
  /** 뽀모도로 */
  POMODORO_STATE: 'pomodoro:state',
  POMODORO_GET: 'pomodoro:get',
  POMODORO_COMMAND: 'pomodoro:command',
  /** 리포트 조회 (구간 마감 → 큐 flush → GET 순서로 처리된다) */
  REPORT_GET: 'report:get',
  /** main → 모든 창: 설정이 바뀌었다 */
  SETTINGS_UPDATED: 'settings:updated',
  /** 기록이 있는 날짜들 (캘린더 표시용) */
  REPORT_RECORDED_DATES: 'report:recorded-dates',
  /** 개발용: mock 시나리오 바꾸기 */
  MOCK_SET_SCENARIO: 'mock:set-scenario',
  MOCK_GET_SCENARIO: 'mock:get-scenario'
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
    /** 설정이 바뀔 때마다 호출된다 (해제 함수를 돌려준다) */
    onChange: (listener: (settings: Settings) => void) => () => void
  }
  report: {
    /** @param date `YYYY-MM-DD` (KST). 생략하면 오늘 */
    get: (date?: string) => Promise<ReportView>
    /** 기록이 있는 날짜 `YYYY-MM-DD` 목록 */
    recordedDates: () => Promise<string[]>
  }
  /** 개발용. mock 이 꺼져 있으면 아무 일도 하지 않는다 */
  mock: {
    getScenario: () => Promise<string | null>
    setScenario: (scenario: string) => Promise<string | null>
  }
  pomodoro: {
    get: () => Promise<PomodoroState>
    start: () => void
    pause: () => void
    stop: () => void
    onState: (listener: (state: PomodoroState) => void) => () => void
  }
  posture: {
    /** app → detector: 감지 시작/정지 (사용자가 버튼을 눌렀을 때만) */
    start: () => void
    stop: () => void
    /**
     * 카메라만 켠다 (온보딩·기준 다시 잡기).
     * 감지 세션은 시작하지 않아서 경과 시간·사용 구간·이벤트가 쌓이지 않는다.
     */
    openCamera: () => void
    /** 카메라만 켜 둔 상태면 끈다. 감지 중이면 그대로 둔다 */
    closeCameraIfIdle: () => void
    getStatus: () => Promise<DetectorStatus>
    /** app 쪽 구독 (해제 함수를 돌려준다) */
    onSample: (listener: (sample: PostureSample) => void) => () => void
    onStatus: (listener: (status: DetectorStatus) => void) => () => void
    /** 감지 경과 시간 */
    getDetection: () => Promise<DetectionState>
    onDetection: (listener: (state: DetectionState) => void) => () => void
    /** 멈추고 경과 시간을 0 으로 */
    reset: () => void
    /** 자세 판정 상태 구독 */
    onState: (listener: (view: PostureView) => void) => () => void
    /** 지금 자세를 기준으로 저장 + 결과 구독 */
    calibrate: () => void
    onCalibration: (listener: (phase: CalibrationPhase) => void) => () => void
    /** 온보딩 카메라 프리뷰 (화면을 벗어나면 반드시 끈다) */
    setPreview: (on: boolean) => void
    onPreviewFrame: (listener: (frame: string) => void) => () => void
    /** overlay 쪽 */
    bubbleShown: (bubbleType: BubbleType) => void
    setClickable: (on: boolean) => void
    openRecalibrate: () => void
    /** app 쪽: 말풍선을 눌러 기준 다시 잡기로 들어올 때 */
    onRecalibrate: (listener: () => void) => () => void
    /** detector 쪽 */
    onCommand: (listener: (command: DetectorCommand) => void) => () => void
    onCalibrateRequest: (listener: () => void) => () => void
    onPreviewRequest: (listener: (on: boolean) => void) => () => void
    sendPreviewFrame: (frame: string) => void
    sendUpdate: (update: DetectionUpdate) => void
    sendCalibration: (phase: CalibrationPhase) => void
    sendStatus: (status: DetectorStatus) => void
  }
}
