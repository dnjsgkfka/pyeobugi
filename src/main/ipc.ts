import { app, BrowserWindow, ipcMain, type IpcMainEvent } from 'electron'
import { IPC, isWindowName } from '@shared/ipc'
import { hideWindow, showWindow } from './windows'

export function registerIpc(): void {
  ipcMain.on(IPC.APP_QUIT, () => app.quit())

  ipcMain.on(IPC.WINDOW_SHOW, (_event, name: unknown) => {
    if (isWindowName(name)) showWindow(name)
  })

  ipcMain.on(IPC.WINDOW_HIDE, (_event, name: unknown) => {
    if (isWindowName(name)) hideWindow(name)
  })

  /* 테두리 없는 창이라 최소화·전체·닫기를 직접 처리한다 */
  const sender = (event: IpcMainEvent): BrowserWindow | null =>
    BrowserWindow.fromWebContents(event.sender)

  ipcMain.on(IPC.WINDOW_MINIMIZE, (event) => sender(event)?.minimize())

  ipcMain.on(IPC.WINDOW_TOGGLE_MAXIMIZE, (event) => {
    const win = sender(event)
    if (!win) return
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })

  // 닫기는 창만 숨긴다 — 트레이에 남아 감지를 이어 간다 (완전 종료는 트레이 메뉴)
  ipcMain.on(IPC.WINDOW_CLOSE, (event) => sender(event)?.hide())
}
