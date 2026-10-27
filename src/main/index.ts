import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { initApi } from './api'
import { registerCameraPermissions, registerDetectorIpc } from './detector'
import { registerIpc } from './ipc'
import { initSettings, registerOnboardingIpc } from './onboarding'
import { configurePosture, registerPostureIpc } from './posture'
import { initQueue } from './queue'
import { registerShutdown, startSession } from './session'
import { createTray } from './tray'
import { createWindows, showWindow } from './windows'

/**
 * Windows 에서 Chromium 의 기본 캡처 경로(Media Foundation)가 카메라를 못 여는 장치가 있다
 * (AbortError: Timeout starting video source). 예전 방식(DirectShow)으로 돌린다.
 * app.whenReady() 보다 먼저 호출해야 한다.
 */
if (process.platform === 'win32') {
  app.commandLine.appendSwitch('disable-features', 'MediaFoundationVideoCapture')
}

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
    initSettings()
    registerIpc()
    registerOnboardingIpc()
    registerDetectorIpc()
    registerPostureIpc()
    configurePosture()
    registerCameraPermissions()
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
