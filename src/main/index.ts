import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { initApi } from './api'
import { registerIpc } from './ipc'
import { initQueue } from './queue'
import { registerShutdown, startSession } from './session'
import { createTray } from './tray'
import { createWindows, showWindow } from './windows'

// 단일 인스턴스: 두 번째 실행은 바로 종료하고, 기존 앱 창을 앞으로 가져온다.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => showWindow('app'))

  app.whenReady().then(async () => {
    electronApp.setAppUserModelId('com.turtle.app')

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    await initApi()
    initQueue()
    startSession()
    registerIpc()
    createWindows()
    createTray()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindows()
    })
  })

  registerShutdown()

  // 창을 닫아도(=숨김) 트레이에 남아야 하므로 window-all-closed 에서 종료하지 않는다.
  app.on('window-all-closed', () => {})
}
