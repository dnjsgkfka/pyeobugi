import { app, Menu, nativeImage, Tray } from 'electron'
import icon from '../../resources/icon.png?asset'
import { showWindow } from './windows'

let tray: Tray | null = null

export function createTray(): void {
  tray = new Tray(nativeImage.createFromPath(icon).resize({ width: 16, height: 16 }))
  tray.setToolTip('펴부기')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '열기', click: () => showWindow('app') },
      { type: 'separator' },
      { label: '종료', click: () => app.quit() }
    ])
  )
  tray.on('click', () => showWindow('app'))
}
