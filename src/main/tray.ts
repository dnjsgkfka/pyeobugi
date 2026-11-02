import { app, Menu, nativeImage, Tray } from 'electron'
import icon from '../../resources/icon.png?asset'
import { showWindow } from './windows'

/** 트레이 아이콘이 보여 주는 상태 */
export type TrayState = 'idle' | 'good' | 'bad' | 'away'

// TODO(design): 상태별 아이콘 4종을 받으면 상태마다 다른 그림으로 바꾼다. 지금은 툴팁만 바뀐다.

const TOOLTIP: Record<TrayState, string> = {
  idle: '펴부기 — 감지 꺼짐',
  good: '펴부기 — 바른 자세',
  bad: '펴부기 — 자세가 무너졌어요',
  away: '펴부기 — 자리를 비웠어요'
}

let tray: Tray | null = null
let state: TrayState = 'idle'

export function createTray(): void {
  tray = new Tray(nativeImage.createFromPath(icon).resize({ width: 16, height: 16 }))
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
  tray.setToolTip(TOOLTIP[next])
}
