import { app, ipcMain } from 'electron'
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
}
