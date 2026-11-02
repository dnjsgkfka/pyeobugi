import { app, Menu, nativeImage, Tray } from 'electron'
import idleIcon from '../../resources/tray-idle.png?asset'
import goodIcon from '../../resources/tray-good.png?asset'
import badIcon from '../../resources/tray-bad.png?asset'
import awayIcon from '../../resources/tray-away.png?asset'
import { showWindow } from './windows'

/** 트레이 아이콘이 보여 주는 상태 */
export type TrayState = 'idle' | 'good' | 'bad' | 'away'

const ICONS: Record<TrayState, string> = {
  idle: idleIcon,
  good: goodIcon,
  bad: badIcon,
  away: awayIcon
}

const TOOLTIP: Record<TrayState, string> = {
  idle: '펴부기 — 감지 꺼짐',
  good: '펴부기 — 바른 자세',
  bad: '펴부기 — 자세가 무너졌어요',
  away: '펴부기 — 자리를 비웠어요'
}

let tray: Tray | null = null
let state: TrayState = 'idle'

function imageFor(next: TrayState): Electron.NativeImage {
  return nativeImage.createFromPath(ICONS[next]).resize({ width: 16, height: 16 })
}

export function createTray(): void {
  tray = new Tray(imageFor('idle'))
  tray.setToolTip(TOOLTIP.idle)
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '열기', click: () => showWindow('app') },
      { type: 'separator' },
      { label: '종료', click: () => app.quit() }
    ])
  )
  tray.on('click', () => showWindow('app'))
}

/** 자세 판정이 바뀔 때마다 부른다. 같은 상태면 아무 일도 하지 않는다. */
export function setTrayState(next: TrayState): void {
  if (!tray || next === state) return
  state = next
  tray.setImage(imageFor(next))
  tray.setToolTip(TOOLTIP[next])
}
