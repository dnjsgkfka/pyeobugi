import type { Baseline } from './calibration'
import type { DetectorCommand, DetectorStatus, PostureSample } from './detector'
import type { PomodoroState } from './pomodoro'
import type { PostureResult } from './posture-engine'

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
  CAMERA_OPEN_SETTINGS: 'camera:open-settings',
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
  /** 기준 자세 저장 + CALIBRATION_COMPLETED 이벤트 */
  CALIBRATION_SAVE: 'calibration:save',
  /** main → app/overlay: 판정 결과 (good / slipping / bad / away) */
  POSTURE_STATE: 'posture:state',
  /** 감지 경과 시간 */
  DETECTION_STATE: 'detection:state',
  DETECTION_GET: 'detection:get',
  DETECTION_RESET: 'detection:reset',
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
    /** app → detector: 감지 시작/정지 */
    start: () => void
    stop: () => void
    getStatus: () => Promise<DetectorStatus>
    /** app 쪽 구독 (해제 함수를 돌려준다) */
    onSample: (listener: (sample: PostureSample) => void) => () => void
    onStatus: (listener: (status: DetectorStatus) => void) => () => void
    /** 감지 경과 시간 */
    getDetection: () => Promise<DetectionState>
    onDetection: (listener: (state: DetectionState) => void) => () => void
    /** 멈추고 경과 시간을 0 으로 */
    reset: () => void
    /** 자세 판정 결과 구독 */
    onState: (listener: (result: PostureResult) => void) => () => void
    /** detector 쪽 */
    onCommand: (listener: (command: DetectorCommand) => void) => () => void
    sendSample: (sample: PostureSample) => void
    sendStatus: (status: DetectorStatus) => void
  }
}
