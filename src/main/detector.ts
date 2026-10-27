import { ipcMain, session, shell, type IpcMainEvent } from 'electron'
import {
  isDetectorCommand,
  isDetectorStatus,
  PostureSampleSchema,
  type DetectorStatus
} from '@shared/detector'
import { IPC } from '@shared/ipc'
import { getWindow } from './windows'

let status: DetectorStatus = 'idle'

function fromDetector(event: IpcMainEvent): boolean {
  return event.sender === getWindow('detector')?.webContents
}

/** detector ↔ app 사이의 중계. 샘플은 이 안에서만 돌고 이벤트 큐/서버로 가지 않는다. */
export function registerDetectorIpc(): void {
  ipcMain.on(IPC.DETECTOR_COMMAND, (_event, command: unknown) => {
    if (isDetectorCommand(command))
      getWindow('detector')?.webContents.send(IPC.DETECTOR_COMMAND, command)
  })

  ipcMain.on(IPC.DETECTOR_STATUS, (event, next: unknown) => {
    if (!fromDetector(event) || !isDetectorStatus(next)) return
    status = next
    getWindow('app')?.webContents.send(IPC.DETECTOR_STATUS, next)
  })

  ipcMain.handle(IPC.DETECTOR_GET_STATUS, () => status)

  ipcMain.on(IPC.POSTURE_SAMPLE, (event, raw: unknown) => {
    if (!fromDetector(event)) return
    const parsed = PostureSampleSchema.safeParse(raw)
    if (parsed.success) getWindow('app')?.webContents.send(IPC.POSTURE_SAMPLE, parsed.data)
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
