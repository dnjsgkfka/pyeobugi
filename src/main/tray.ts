import { app, Menu, nativeImage, Tray, type MenuItemConstructorOptions } from 'electron'
import { toKstIso } from '@shared/time'
import icon from '../../resources/icon.png?asset'
import { PAUSE_OPTIONS } from './pause'
import { showWindow } from './windows'

/** 트레이 아이콘이 보여 주는 상태 */
export type TrayState = 'idle' | 'good' | 'bad' | 'away' | 'paused'

// TODO(design): 상태별 아이콘 4종을 받으면 상태마다 다른 그림으로 바꾼다. 지금은 툴팁만 바뀐다.

const TOOLTIP: Record<TrayState, string> = {
  idle: '펴부기 — 감지 꺼짐',
  good: '펴부기 — 바른 자세',
  bad: '펴부기 — 자세가 무너졌어요',
  away: '펴부기 — 자리를 비웠어요',
  paused: '펴부기 — 일시정지 중'
}

/** What the tray menu needs to know about detection (injected to avoid import cycles) */
export interface TrayControls {
  /** Detection session is running and can be paused */
  canPause: () => boolean
  /** Paused now? `until` is epoch ms or null when paused until resumed */
  pauseState: () => { paused: boolean; until: number | null }
  pause: (durationMs: number | null) => void
  resume: () => void
}

let tray: Tray | null = null
let state: TrayState = 'idle'
let controls: TrayControls | null = null

/** "HH:MM" in KST */
function clock(epochMs: number): string {
  return toKstIso(new Date(epochMs)).slice(11, 16)
}

function buildMenu(): Menu {
  const items: MenuItemConstructorOptions[] = [{ label: '열기', click: () => showWindow('app') }]

  if (controls) {
    const { paused, until } = controls.pauseState()
    items.push({ type: 'separator' })
    if (paused) {
      items.push({
        label: until === null ? '감지 다시 시작' : `감지 다시 시작 (${clock(until)}까지 일시정지)`,
        click: () => controls?.resume()
      })
    } else {
      items.push({
        label: '일시정지',
        enabled: controls.canPause(),
        submenu: PAUSE_OPTIONS.map(({ label, ms }) => ({
          label,
          click: () => controls?.pause(ms)
        }))
      })
    }
  }

  items.push({ type: 'separator' }, { label: '종료', click: () => app.quit() })
  return Menu.buildFromTemplate(items)
}

export function createTray(trayControls?: TrayControls): void {
  controls = trayControls ?? null
  tray = new Tray(nativeImage.createFromPath(icon).resize({ width: 16, height: 16 }))
  tray.setToolTip(TOOLTIP.idle)
  tray.setContextMenu(buildMenu())
  tray.on('click', () => showWindow('app'))
}

/** 감지가 켜지거나 꺼지거나 일시정지될 때 부른다 (메뉴 항목의 활성 상태가 바뀐다) */
export function refreshTrayMenu(): void {
  tray?.setContextMenu(buildMenu())
}

/** 자세 판정이 바뀔 때마다 부른다. 같은 상태면 아무 일도 하지 않는다. */
export function setTrayState(next: TrayState): void {
  if (!tray || next === state) return
  state = next
  tray.setToolTip(TOOLTIP[next])
}
