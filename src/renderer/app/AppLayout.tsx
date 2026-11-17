import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { NavSidebar } from '@renderer/ui/NavSidebar'
import { TitleBar } from '@renderer/ui/TitleBar'
import { Toast } from '@renderer/ui/Toast'
import { useToast } from '@renderer/ui/useToast'

/**
 * 1280×832 화면의 기본 틀 (Figma 기준).
 * 사이드바의 빈 곳을 누르면 펼쳐지고 접힌다 (메뉴·감지 버튼은 제 일만 한다).
 * 펼침: 사이드바 240 + 본문 976 / 접힘: 사이드바 80 + 본문 1140
 *
 * TODO(디자인): 레이아웃이 고정 크기라, 창을 키우면 그 덩어리를 가운데에 두고
 * 남는 자리는 배경으로 둔다. 가변 폭 레이아웃은 따로 정해야 한다.
 */
export default function AppLayout(): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false)
  const toast = useToast()

  // 자리비움으로 감지가 멈추면 카메라도 꺼져 있어 돌아와도 앱이 알 수 없다 → 알려 준다
  useEffect(
    () =>
      window.api.posture.onAutoStopped(() => {
        toast.show('자리를 비우셔서 감지를 멈췄어요. 기록은 저장했어요.')
      }),
    [toast]
  )

  return (
    <div
      className="relative flex h-full items-center justify-center overflow-hidden bg-main5"
      data-drag
    >
      {/* 창 버튼은 레이아웃과 무관하게 창 오른쪽 위에 겹쳐 둔다 */}
      <div className="absolute top-0 right-0 z-50">
        <TitleBar />
      </div>
      {/* 창이 더 커져도 디자인 크기를 유지하고 가운데에 둔다 */}
      <div className="flex h-[832px] w-[1280px] shrink-0 items-start">
        <div className="py-4 pr-6 pl-4">
          <NavSidebar collapsed={collapsed} onToggle={() => setCollapsed((now) => !now)} />
        </div>
        <div
          className="flex flex-col gap-[21px] self-center"
          style={{ width: collapsed ? 1140 : 976 }}
        >
          <Outlet />
        </div>
      </div>
      {toast.message && <Toast message={toast.message} onDismiss={toast.dismiss} />}
    </div>
  )
}
