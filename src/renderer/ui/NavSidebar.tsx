import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import type { DetectionState } from '@shared/ipc'
import { formatElapsed } from '@shared/pomodoro'
import {
  IconPause,
  IconPlay,
  IconStop,
  IconReport,
  IconReportActive,
  IconSettings,
  IconSettingsActive,
  LogoFull,
  LogoSymbol
} from './icons'

interface TabProps {
  to: string
  label: string
  icon: React.JSX.Element
  activeIcon: React.JSX.Element
  collapsed: boolean
}

/** Nav/Tab — 펼침 210×48(padding 8, gap 12) / 접힘 48×48. 선택되면 bg main2 + SemiBold */
function Tab({ to, label, icon, activeIcon, collapsed }: TabProps): React.JSX.Element {
  return (
    <NavLink to={to} className="block" title={collapsed ? label : undefined}>
      {({ isActive }) => (
        <span
          className={`flex h-12 items-center rounded-sm p-2 text-grey-200 ${
            collapsed ? 'w-12 justify-center gap-4' : 'w-full gap-3'
          } ${isActive ? 'text-label-b bg-main2' : 'text-label'}`}
        >
          <span className="size-6 shrink-0">{isActive ? activeIcon : icon}</span>
          {!collapsed && label}
        </span>
      )}
    </NavLink>
  )
}

/** Nav/Action Button — 펼침 210×44 / 접힘 44×44. bg main5, radius 6 */
function ActionButton({
  collapsed,
  label,
  icon,
  onClick
}: {
  collapsed: boolean
  label: string
  icon: React.JSX.Element
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      title={collapsed ? label : undefined}
      className={`text-label-b flex h-11 items-center justify-center gap-1 rounded-sm bg-main5 p-2.5 text-grey-900 ${
        collapsed ? 'w-11' : 'w-full'
      }`}
      onClick={onClick}
    >
      {!collapsed && label}
      {icon}
    </button>
  )
}

/** Nav/Timer — 일시정지 / 감지 경과 시간 / 종료. 폭 210, 버튼 44×44 */
function Timer({
  elapsedMs,
  collapsed
}: {
  elapsedMs: number
  collapsed: boolean
}): React.JSX.Element {
  const pause = (
    <button
      type="button"
      className="flex size-11 items-center justify-center rounded-sm bg-main5"
      aria-label="일시정지"
      onClick={() => window.api.posture.stop()}
    >
      <IconPause className="text-main1" />
    </button>
  )
  if (collapsed) return pause

  return (
    <div className="flex w-full items-center justify-between">
      {pause}
      <span className="text-heading text-white tabular-nums">{formatElapsed(elapsedMs)}</span>
      <button
        type="button"
        className="flex size-11 items-center justify-center rounded-sm bg-main5"
        aria-label="종료"
        onClick={() => window.api.posture.reset()}
      >
        <IconStop className="text-main1" />
      </button>
    </div>
  )
}

/** Nav/Sidebar — 높이 805, bg main1, radius 12, padding 36px 16px. 접히면 폭 80 */
export function NavSidebar({ collapsed = false }: { collapsed?: boolean }): React.JSX.Element {
  const [detection, setDetection] = useState<DetectionState | null>(null)

  useEffect(() => {
    void window.api.posture.getDetection().then(setDetection)
    return window.api.posture.onDetection(setDetection)
  }, [])

  return (
    <nav
      className={`flex h-[805px] shrink-0 flex-col justify-between rounded-lg bg-main1 px-4 py-9 ${
        collapsed ? 'w-20 items-center' : 'w-60'
      }`}
    >
      <div className={`flex flex-col gap-8 ${collapsed ? 'w-full items-center' : ''}`}>
        {collapsed ? (
          <LogoSymbol className="h-[30px] w-9 shrink-0" />
        ) : (
          <LogoFull className="h-[30px] w-29 shrink-0 self-start" />
        )}
        <div className={`flex flex-col gap-2 ${collapsed ? 'items-center' : ''}`}>
          <Tab
            to="/report"
            label="자세 리포트"
            collapsed={collapsed}
            icon={<IconReport className="text-grey-200" />}
            activeIcon={<IconReportActive className="text-grey-200" />}
          />
          <Tab
            to="/settings"
            label="설정"
            collapsed={collapsed}
            icon={<IconSettings className="text-grey-200" />}
            activeIcon={<IconSettingsActive className="text-grey-200" />}
          />
        </div>
      </div>

      {detection?.running ? (
        <Timer elapsedMs={detection.elapsedMs} collapsed={collapsed} />
      ) : (
        <ActionButton
          collapsed={collapsed}
          label="자세 감지 시작"
          icon={<IconPlay className="shrink-0 text-main1" />}
          onClick={() => window.api.posture.start()}
        />
      )}
    </nav>
  )
}
