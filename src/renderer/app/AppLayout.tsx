import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { NavSidebar } from '@renderer/ui/NavSidebar'

/**
 * 1280×832 화면의 기본 틀 (Figma 기준).
 * 사이드바를 누르면 펼쳐지고, 본문을 누르면 접힌다.
 * 펼침: 사이드바 240 + 본문 976 / 접힘: 사이드바 80 + 본문 1140
 */
export default function AppLayout(): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-full items-start bg-main5" data-drag>
      <div className="py-4 pr-6 pl-4" onClick={() => setCollapsed(false)}>
        <NavSidebar collapsed={collapsed} />
      </div>
      <div
        className="flex flex-col gap-[21px] self-center"
        style={{ width: collapsed ? 1140 : 976 }}
        onClick={() => setCollapsed(true)}
      >
        <Outlet />
      </div>
    </div>
  )
}
