import { BrowserWindow, ipcMain, session, shell, type IpcMainEvent } from 'electron'
import { isDetectorCommand, isDetectorStatus, type DetectorStatus } from '@shared/detector'
import { IPC } from '@shared/ipc'
import { flushUsage } from './posture'
import { setTrayState } from './tray'
import { getWindow } from './windows'

let status: DetectorStatus = 'idle'

/** 감지 경과 시간. 멈추면 멈춘 만큼만 쌓아 둔다 */
let runningSince: number | null = null
let accumulated = 0
let ticker: ReturnType<typeof setInterval> | null = null

function elapsedMs(): number {
  return accumulated + (runningSince === null ? 0 : Date.now() - runningSince)
}

function broadcastDetection(): void {
  const state = { running: runningSince !== null, elapsedMs: elapsedMs() }
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IPC.DETECTION_STATE, state)
  }
}

function beginSession(): void {
  if (runningSince !== null) return
  runningSince = Date.now()
  ticker ??= setInterval(broadcastDetection, 1_000)
  broadcastDetection()
}

/** @param reset true 면 경과 시간을 0 으로 (종료 버튼) */
function endSession(reset: boolean): void {
  if (runningSince !== null) accumulated += Date.now() - runningSince
  runningSince = null
  if (reset) accumulated = 0
  if (ticker) clearInterval(ticker)
  ticker = null
  broadcastDetection()
}

function fromDetector(event: IpcMainEvent): boolean {
  return event.sender === getWindow('detector')?.webContents
}

/** detector ↔ app 사이의 중계. 샘플은 이 안에서만 돌고 이벤트 큐/서버로 가지 않는다. */
export function registerDetectorIpc(): void {
  ipcMain.on(IPC.DETECTOR_COMMAND, (_event, command: unknown) => {
    if (!isDetectorCommand(command)) return
    if (command === 'start') beginSession()
    else {
      // 감지를 멈추면 쌓이던 구간을 마감한다
      flushUsage()
      setTrayState('idle')
      endSession(false)
    }
    getWindow('detector')?.webContents.send(IPC.DETECTOR_COMMAND, command)
  })

  ipcMain.on(IPC.DETECTOR_STATUS, (event, next: unknown) => {
    if (!fromDetector(event) || !isDetectorStatus(next)) return
    status = next
    getWindow('app')?.webContents.send(IPC.DETECTOR_STATUS, next)
  })

  ipcMain.handle(IPC.DETECTOR_GET_STATUS, () => status)

  ipcMain.handle(IPC.DETECTION_GET, () => ({
    running: runningSince !== null,
    elapsedMs: elapsedMs()
  }))

  // 종료 버튼: 멈추고 경과 시간도 되돌린다
  ipcMain.on(IPC.DETECTION_RESET, () => {
    flushUsage()
    setTrayState('idle')
    endSession(true)
    getWindow('detector')?.webContents.send(IPC.DETECTOR_COMMAND, 'stop')
  })

  ipcMain.on(IPC.CAMERA_OPEN_SETTINGS, () => {
    if (process.platform === 'win32') void shell.openExternal('ms-settings:privacy-webcam')
  })
}

/**
 * 권한 처리. 브라우저와 달리 팝업이 없으므로 앱이 직접 정한다.
 * 카메라(media)만 허용하고 나머지는 모두 거절한다.
 * 창을 가려서 판단하지 않는 이유: 창이 만들어지기 전이나 webContents 를 못 받는 경로에서
 * 거절이 섞이면, Chromium 이 그 결과를 기억해 이후 요청이 응답 없이 멈춘다.
 * 카메라를 실제로 여는 곳은 detector 창뿐이다.
 */
export function registerCameraPermissions(): void {
  const ses = session.defaultSession
  ses.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'media')
  })
  ses.setPermissionCheckHandler((_webContents, permission) => permission === 'media')
}
