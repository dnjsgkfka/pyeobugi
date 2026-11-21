import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { initApi } from './api'
import {
  isSessionRunning,
  pauseDetection,
  pauseState,
  registerCameraPermissions,
  registerDetectorIpc,
  resumeDetection
} from './detector'
import { registerIpc } from './ipc'
import { initSettings, registerOnboardingIpc } from './onboarding'
import { applyStudyTimer, registerPomodoroIpc } from './pomodoro'
import { applyOverlayVisibility, registerOverlayIpc } from './overlay'
import { registerPostureIpc } from './posture'
import { initReport, registerReportIpc } from './report'
import { initQueue } from './queue'
import { registerShutdown, startSession } from './session'
import { createTray } from './tray'
import { createWindows, showWindow } from './windows'

/**
 * 끄는 Chromium 기능들. `app.whenReady()` 보다 먼저 호출해야 하고,
 * `disable-features` 는 쉼표로 이어 **한 번만** 넘겨야 한다 (두 번 호출하면 하나만 적용된다).
 *
 * - `MediaFoundationVideoCapture` (Windows): 기본 캡처 경로가 카메라를 못 여는 장치가 있다
 *   (AbortError: Timeout starting video source). 예전 방식(DirectShow)으로 돌린다.
 * - `AudioServiceOutOfProcess`: 오디오를 전혀 쓰지 않는데(getUserMedia `audio: false`)
 *   카메라를 열면 Chromium 이 오디오 서비스를 별도 프로세스로 띄워 80MB 가량을 쓴다.
 *   브라우저 프로세스 안에서 돌게 해 그 프로세스를 없앤다.
 */
const DISABLED_FEATURES = [
  ...(process.platform === 'win32' ? ['MediaFoundationVideoCapture'] : []),
  'AudioServiceOutOfProcess'
]
app.commandLine.appendSwitch('disable-features', DISABLED_FEATURES.join(','))

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
    registerOverlayIpc()
    registerPomodoroIpc()
    initReport()
    registerReportIpc()
    registerCameraPermissions()
    createWindows()
    // 설정에서 오버레이를 꺼 뒀으면 거북이 창을 띄우지 않는다
    applyOverlayVisibility()
    // 공부 타이머를 켜 둔 채 종료했으면 다시 돌린다
    applyStudyTimer()
    createTray({
      canPause: isSessionRunning,
      pauseState,
      pause: pauseDetection,
      resume: resumeDetection
    })

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindows()
    })
  })

  registerShutdown()

  // 창을 닫아도(=숨김) 트레이에 남아야 하므로 window-all-closed 에서 종료하지 않는다.
  app.on('window-all-closed', () => {})
}
