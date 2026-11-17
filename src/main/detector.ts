import { BrowserWindow, ipcMain, session, shell, type IpcMainEvent } from 'electron'
import { isDetectorCommand, isDetectorStatus, type DetectorStatus } from '@shared/detector'
import { IPC } from '@shared/ipc'
import { flushUsage } from './posture'
import { setTrayState } from './tray'
import { destroyDetector, ensureDetector, getWindow } from './windows'

let status: DetectorStatus = 'idle'

/**
 * 프리뷰 요청은 detector 창이 뜨기 전에 올 수 있다 (온보딩에서 자식 컴포넌트의 effect 가
 * 부모보다 먼저 돈다). 원하는 상태를 들고 있다가 창이 준비되면 그때 넘긴다.
 */
let wantedPreview = false

export function setWantedPreview(on: boolean): void {
  wantedPreview = on
}

/** 감지·기준 잡기에만 창을 만든다 (쓰지 않을 때 200MB 이상을 아낀다) */
async function openDetector(): Promise<void> {
  const win = await ensureDetector()
  // 기다리는 동안 멈췄을 수 있다
  if (win.isDestroyed()) return
  // 프리뷰 여부를 먼저 알려야 카메라가 처음부터 프리뷰 해상도로 열린다
  // (start 를 먼저 보내면 320×240 으로 열린 뒤 다시 열지 않는다)
  if (wantedPreview) win.webContents.send(IPC.PREVIEW_SET, true)
  win.webContents.send(IPC.DETECTOR_COMMAND, 'start')
}

/** 창째로 없앤다 — 렌더러·wasm·카메라 캡처 프로세스가 같이 정리된다 */
function closeDetector(): void {
  destroyDetector()
  if (status === 'idle') return
  status = 'idle'
  getWindow('app')?.webContents.send(IPC.DETECTOR_STATUS, 'idle')
}

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

/** 사용자가 '자세 감지 시작' 을 눌러 세션이 돌아가는 중인가 */
export function isSessionRunning(): boolean {
  return runningSince !== null
}

/**
 * 자리비움으로 감지를 자동으로 멈춘다 (설정의 '자리비움' 을 켰을 때).
 * 멈추기 전에 구간을 마감하므로 자리를 뜨기 전까지의 기록은 그대로 남는다
 * (UsageTracker 가 얼굴이 사라진 시점으로 소급해 마감한다).
 * 카메라도 끄기 때문에 돌아와도 앱이 알 수 없다 → 사용자에게 알린다.
 */
export function stopForAway(): void {
  if (runningSince === null) return
  flushUsage()
  setTrayState('idle')
  endSession(false)
  closeDetector()
  getWindow('app')?.webContents.send(IPC.DETECTION_AUTO_STOPPED)
}

function fromDetector(event: IpcMainEvent): boolean {
  return event.sender === getWindow('detector')?.webContents
}

/** detector ↔ app 사이의 중계. 샘플은 이 안에서만 돌고 이벤트 큐/서버로 가지 않는다. */
export function registerDetectorIpc(): void {
  ipcMain.on(IPC.DETECTOR_COMMAND, (_event, command: unknown) => {
    if (!isDetectorCommand(command)) return
    if (command === 'start') beginSession()
    else if (command === 'camera') {
      // 카메라만 켠다 (기준 잡기). 세션은 시작하지 않는다
    } else {
      // 감지를 멈추면 쌓이던 구간을 마감한다
      flushUsage()
      setTrayState('idle')
      endSession(false)
    }
    if (command === 'stop') {
      closeDetector()
      return
    }
    // detector 는 카메라만 켜는 것과 감지를 구분하지 않는다
    void openDetector()
  })

  // 온보딩 화면을 벗어날 때. 감지 중이면 끄지 않는다
  ipcMain.on(IPC.DETECTOR_CLOSE_IF_IDLE, () => {
    if (runningSince !== null) return
    setTrayState('idle')
    closeDetector()
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
    closeDetector()
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
