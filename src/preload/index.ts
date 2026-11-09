import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { Baseline } from '@shared/calibration'
import type { BubbleType } from '@shared/bubble'
import type {
  CalibrationPhase,
  DetectionUpdate,
  DetectorCommand,
  DetectorStatus,
  PostureSample,
  PreviewFrame
} from '@shared/detector'
import type { PomodoroState } from '@shared/pomodoro'
import type { ReportView } from '@shared/report'
import type { Settings } from '@shared/schemas/settings'
import {
  IPC,
  type DetectionState,
  type PostureView,
  type PreloadApi,
  type WindowName
} from '@shared/ipc'

function subscribe<T>(channel: string, listener: (value: T) => void): () => void {
  const handler = (_event: IpcRendererEvent, value: T): void => listener(value)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

const api: PreloadApi = {
  app: {
    quit: () => ipcRenderer.send(IPC.APP_QUIT)
  },
  window: {
    show: (name: WindowName) => ipcRenderer.send(IPC.WINDOW_SHOW, name),
    hide: (name: WindowName) => ipcRenderer.send(IPC.WINDOW_HIDE, name),
    minimize: () => ipcRenderer.send(IPC.WINDOW_MINIMIZE),
    toggleMaximize: () => ipcRenderer.send(IPC.WINDOW_TOGGLE_MAXIMIZE),
    close: () => ipcRenderer.send(IPC.WINDOW_CLOSE)
  },
  camera: {
    openSettings: () => ipcRenderer.send(IPC.CAMERA_OPEN_SETTINGS)
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC.SETTINGS_GET),
    update: (patch: Partial<Settings>) => ipcRenderer.invoke(IPC.SETTINGS_UPDATE, patch),
    saveCalibration: (baseline: Baseline, isRecalibration: boolean) =>
      ipcRenderer.invoke(IPC.CALIBRATION_SAVE, baseline, isRecalibration),
    onChange: (listener: (settings: Settings) => void) =>
      subscribe<Settings>(IPC.SETTINGS_UPDATED, listener)
  },
  report: {
    get: (date?: string): Promise<ReportView> => ipcRenderer.invoke(IPC.REPORT_GET, date),
    recordedDates: (): Promise<string[]> => ipcRenderer.invoke(IPC.REPORT_RECORDED_DATES)
  },
  mock: {
    getScenario: () => ipcRenderer.invoke(IPC.MOCK_GET_SCENARIO),
    setScenario: (scenario: string) => ipcRenderer.invoke(IPC.MOCK_SET_SCENARIO, scenario)
  },
  pomodoro: {
    get: () => ipcRenderer.invoke(IPC.POMODORO_GET),
    start: () => ipcRenderer.send(IPC.POMODORO_COMMAND, 'start'),
    pause: () => ipcRenderer.send(IPC.POMODORO_COMMAND, 'pause'),
    stop: () => ipcRenderer.send(IPC.POMODORO_COMMAND, 'stop'),
    onState: (listener: (state: PomodoroState) => void) =>
      subscribe<PomodoroState>(IPC.POMODORO_STATE, listener)
  },
  posture: {
    start: () => ipcRenderer.send(IPC.DETECTOR_COMMAND, 'start'),
    stop: () => ipcRenderer.send(IPC.DETECTOR_COMMAND, 'stop'),
    openCamera: () => ipcRenderer.send(IPC.DETECTOR_COMMAND, 'camera'),
    closeCameraIfIdle: () => ipcRenderer.send(IPC.DETECTOR_CLOSE_IF_IDLE),
    getStatus: () => ipcRenderer.invoke(IPC.DETECTOR_GET_STATUS),
    onSample: (listener: (sample: PostureSample) => void) =>
      subscribe<PostureSample>(IPC.POSTURE_SAMPLE, listener),
    onStatus: (listener: (status: DetectorStatus) => void) =>
      subscribe<DetectorStatus>(IPC.DETECTOR_STATUS, listener),
    getDetection: (): Promise<DetectionState> => ipcRenderer.invoke(IPC.DETECTION_GET),
    onDetection: (listener: (state: DetectionState) => void) =>
      subscribe<DetectionState>(IPC.DETECTION_STATE, listener),
    reset: () => ipcRenderer.send(IPC.DETECTION_RESET),
    onState: (listener: (view: PostureView) => void) =>
      subscribe<PostureView>(IPC.POSTURE_STATE, listener),
    calibrate: () => ipcRenderer.send(IPC.CALIBRATION_START),
    onCalibration: (listener: (phase: CalibrationPhase) => void) =>
      subscribe<CalibrationPhase>(IPC.CALIBRATION_STATE, listener),
    setPreview: (on: boolean) => ipcRenderer.send(IPC.PREVIEW_SET, on),
    onPreviewFrame: (listener: (preview: PreviewFrame) => void) =>
      subscribe<PreviewFrame>(IPC.PREVIEW_FRAME, listener),
    onCommand: (listener: (command: DetectorCommand) => void) =>
      subscribe<DetectorCommand>(IPC.DETECTOR_COMMAND, listener),
    bubbleShown: (bubbleType: BubbleType) => ipcRenderer.send(IPC.BUBBLE_SHOWN, bubbleType),
    setClickable: (on: boolean) => ipcRenderer.send(IPC.OVERLAY_CLICKABLE, on),
    openRecalibrate: () => ipcRenderer.send(IPC.OVERLAY_RECALIBRATE),
    onRecalibrate: (listener: () => void) => subscribe(IPC.OVERLAY_RECALIBRATE, listener),
    onCalibrateRequest: (listener: () => void) => subscribe(IPC.CALIBRATION_START, listener),
    onPreviewRequest: (listener: (on: boolean) => void) =>
      subscribe<boolean>(IPC.PREVIEW_SET, listener),
    sendPreviewFrame: (preview: PreviewFrame) => ipcRenderer.send(IPC.PREVIEW_FRAME, preview),
    sendUpdate: (update: DetectionUpdate) => ipcRenderer.send(IPC.POSTURE_UPDATE, update),
    sendCalibration: (phase: CalibrationPhase) => ipcRenderer.send(IPC.CALIBRATION_STATE, phase),
    sendStatus: (status: DetectorStatus) => ipcRenderer.send(IPC.DETECTOR_STATUS, status)
  }
}

contextBridge.exposeInMainWorld('api', api)
