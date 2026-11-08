import { BrowserWindow, screen, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import type { WindowName } from '@shared/ipc'
import icon from '../../resources/icon.png?asset'

const windows: Partial<Record<WindowName, BrowserWindow>> = {}
let quitting = false

/** 앱을 진짜 종료하는 중이면 true — 이때만 창이 실제로 닫힌다. */
export function markQuitting(): void {
  quitting = true
}

export function getWindow(name: WindowName): BrowserWindow | undefined {
  return windows[name]
}

function webPreferences(extra: Electron.WebPreferences = {}): Electron.WebPreferences {
  return { preload: join(__dirname, '../preload/index.js'), sandbox: false, ...extra }
}

function loadPage(win: BrowserWindow, name: WindowName): void {
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/${name}/index.html`)
  } else {
    win.loadFile(join(__dirname, `../renderer/${name}/index.html`))
  }
}

/** 닫기 = 숨김 (트레이에 남는다) */
function hideOnClose(win: BrowserWindow): void {
  win.on('close', (event) => {
    if (quitting) return
    event.preventDefault()
    win.hide()
  })
}

function createApp(): BrowserWindow {
  const win = new BrowserWindow({
    // 디자인(1280×832)은 내용 영역 기준이다. useContentSize 가 없으면
    // 창 테두리·타이틀바만큼 내용이 줄어 스크롤이 생긴다.
    useContentSize: true,
    width: 1280,
    height: 832,
    // 디자인에 타이틀바가 없다 → 테두리 없는 창.
    // 둥근 모서리는 Windows 11 이 알아서 그려 준다 (Win10 은 각진 모서리).
    frame: false,
    resizable: false,
    show: false,
    title: '펴부기',
    // 개발 모드에서는 Electron 실행 파일 아이콘이 쓰이므로 창 아이콘을 직접 준다
    // (패키징 빌드는 build/icon.ico 를 쓴다)
    icon,
    webPreferences: webPreferences()
  })
  win.on('ready-to-show', () => win.show())
  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })
  hideOnClose(win)
  loadPage(win, 'app')
  return win
}

/**
 * 카메라 + 자세 추론 전용.
 * 사용자에게 보이지 않아야 하지만, 한 번도 보여지지 않은 창에서는 Windows 가 카메라를
 * 열어주지 않는다(AbortError: Timeout starting video source). 그래서 숨기는 대신
 * 화면 밖으로 치워 두고 띄운다. 작업 표시줄에도 뜨지 않고 포커스도 가져가지 않는다.
 */
const OFFSCREEN = -4000

function createDetector(): BrowserWindow {
  const win = new BrowserWindow({
    x: OFFSCREEN,
    y: OFFSCREEN,
    width: 320,
    height: 240,
    show: false,
    frame: false,
    skipTaskbar: true,
    focusable: false,
    webPreferences: webPreferences({ backgroundThrottling: false })
  })
  win.on('ready-to-show', () => {
    win.showInactive()
    win.setPosition(OFFSCREEN, OFFSCREEN)
  })
  // MediaPipe 가 구글로 사용 기록을 보내려다 CSP 에 막히며 남기는 소음.
  // 막히는 게 맞는 동작이라 로그만 걸러낸다.
  const NOISE = /odml\.pa\.googleapis\.com/
  // 숨은 창이라 DevTools 를 열어볼 수 없다 → 로그를 main 터미널로 넘긴다
  win.webContents.on('console-message', (event) => {
    if (NOISE.test(event.message)) return
    console.log(`[detector] ${event.message}`)
  })
  hideOnClose(win)
  loadPage(win, 'detector')
  return win
}

/**
 * 화면을 덮는 투명 창. 클릭은 아래 창으로 통과한다.
 * 작업 표시줄을 뺀 영역(workArea)에 맞춘다 — Windows 는 작업 표시줄을
 * alwaysOnTop 창보다 위에 두는 경우가 있어, 그 위를 덮으면 거북이가 가려진다.
 */
function createOverlay(): BrowserWindow {
  const { x, y, width, height } = screen.getPrimaryDisplay().workArea
  const win = new BrowserWindow({
    x,
    y,
    width,
    height,
    show: false,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    hasShadow: false,
    skipTaskbar: true,
    focusable: false,
    alwaysOnTop: true,
    webPreferences: webPreferences()
  })
  win.webContents.on('console-message', (event) => {
    console.log(`[overlay] ${event.message}`)
  })
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setIgnoreMouseEvents(true, { forward: true })
  // 해상도·배율·작업 표시줄이 바뀌면 다시 맞춘다
  const fit = (): void => {
    if (win.isDestroyed()) return
    win.setBounds(screen.getPrimaryDisplay().workArea)
  }
  screen.on('display-metrics-changed', fit)
  screen.on('display-added', fit)
  screen.on('display-removed', fit)
  win.on('closed', () => {
    screen.removeListener('display-metrics-changed', fit)
    screen.removeListener('display-added', fit)
    screen.removeListener('display-removed', fit)
  })
  win.on('ready-to-show', () => win.showInactive())
  hideOnClose(win)
  loadPage(win, 'overlay')
  return win
}

export function createWindows(): void {
  windows.app = createApp()
  windows.detector = createDetector()
  windows.overlay = createOverlay()
}

export function showWindow(name: WindowName): void {
  const win = windows[name]
  if (!win) return
  if (name === 'overlay') {
    win.showInactive()
    return
  }
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
}

export function hideWindow(name: WindowName): void {
  windows[name]?.hide()
}
