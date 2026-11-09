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

/**
 * 거북이 창을 보이거나 숨긴다.
 * - 온보딩을 끝내기 전에는 띄우지 않는다 (기준 잡기 화면 위를 돌아다니면 안 된다)
 * - 오버레이를 꺼도 공부 타이머가 켜져 있으면 창은 띄운다 — 거북이 없이
 *   남은 시간만 오른쪽 아래에 보여 주기 위해서다
 */
export function applyOverlayVisibility(): void {
  const win = getWindow('overlay')
  if (!win) return
  const { onboarded, features } = getSettings().value
  if (onboarded && (features.overlay || features.studyTimer)) win.showInactive()
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
