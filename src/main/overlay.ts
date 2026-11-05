import { BrowserWindow, ipcMain, type IpcMainEvent } from 'electron'
import { BUBBLE_TYPES } from '@shared/schemas/events'
import { IPC } from '@shared/ipc'
import { buildEvent } from './events'
import { getSettings } from './onboarding'
import { getQueue } from './queue'
import { getWindow, showWindow } from './windows'

function isBubbleType(value: unknown): value is (typeof BUBBLE_TYPES)[number] {
  return typeof value === 'string' && (BUBBLE_TYPES as readonly string[]).includes(value)
}

function fromOverlay(event: IpcMainEvent): boolean {
  return event.sender === getWindow('overlay')?.webContents
}

/** 설정의 오버레이 토글에 맞춰 거북이 창을 보이거나 숨긴다 */
export function applyOverlayVisibility(): void {
  const win = getWindow('overlay')
  if (!win) return
  if (getSettings().value.features.overlay) win.showInactive()
  else win.hide()
}

export function registerOverlayIpc(): void {
  ipcMain.on(IPC.BUBBLE_SHOWN, (event: IpcMainEvent, bubbleType: unknown) => {
    if (!fromOverlay(event) || !isBubbleType(bubbleType)) return
    getQueue().enqueue(buildEvent('BUBBLE_SHOWN', { bubbleType }))
  })

  // 눌러야 하는 말풍선이 떠 있는 동안만 클릭을 받는다 (평소에는 클릭이 통과한다)
  ipcMain.on(IPC.OVERLAY_CLICKABLE, (event: IpcMainEvent, on: unknown) => {
    if (!fromOverlay(event)) return
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.setIgnoreMouseEvents(on !== true, { forward: true })
  })

  ipcMain.on(IPC.OVERLAY_RECALIBRATE, (event: IpcMainEvent) => {
    if (!fromOverlay(event)) return
    showWindow('app')
    getWindow('app')?.webContents.send(IPC.OVERLAY_RECALIBRATE)
  })
}
