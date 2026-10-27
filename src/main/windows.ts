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
    width: 1280,
    height: 832,
    show: false,
    title: '펴부기',
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
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

/** 카메라 + 자세 추론 전용. 화면에 보이지 않지만 계속 돌아야 하므로 throttling 을 끈다. */
function createDetector(): BrowserWindow {
  const win = new BrowserWindow({
    width: 640,
    height: 480,
    show: false,
    skipTaskbar: true,
    webPreferences: webPreferences({ backgroundThrottling: false })
  })
  hideOnClose(win)
  loadPage(win, 'detector')
  return win
}

/** 화면 전체를 덮는 투명 창. 클릭은 아래 창으로 통과한다. */
function createOverlay(): BrowserWindow {
  const { x, y, width, height } = screen.getPrimaryDisplay().bounds
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
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setIgnoreMouseEvents(true, { forward: true })
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
