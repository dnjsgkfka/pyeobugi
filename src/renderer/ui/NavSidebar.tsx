import { NavLink } from 'react-router-dom'
import {
  IconPlay,
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

/** Nav/Sidebar — 높이 805, bg main1, radius 12, padding 36px 16px. 접히면 폭 80 */
export function NavSidebar({ collapsed = false }: { collapsed?: boolean }): React.JSX.Element {
  return (
    <nav
      className={`flex h-[805px] shrink-0 flex-col justify-between rounded-lg bg-main1 px-4 py-9 ${
        collapsed ? 'w-20 items-center' : 'w-60'
      }`}
    >
      <div className={`flex flex-col gap-8 ${collapsed ? 'w-full items-center' : ''}`}>
        {collapsed ? (
          <LogoSymbol className="h-[30px] w-9" />
        ) : (
          <LogoFull className="h-[30px] w-auto" />
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

      {/* Nav/Action Button — 펼침 210×44 / 접힘 44×44 */}
      <button
        type="button"
        title={collapsed ? '자세 감지 시작' : undefined}
        className={`text-label-b flex h-11 items-center justify-center gap-1 rounded-sm bg-main5 p-2.5 text-grey-900 ${
          collapsed ? 'w-11' : 'w-full'
        }`}
        onClick={() => window.api.posture.start()}
      >
        {!collapsed && '자세 감지 시작'}
        <IconPlay className="shrink-0 text-main1" />
      </button>
    </nav>
  )
}
