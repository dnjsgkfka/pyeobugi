import { useLocation } from 'react-router-dom'
import { MAC_TITLE_BAR_HEIGHT } from '@shared/ipc'

/** Screens with a dark (main1) background, so the bar blends in */
function isDarkScreen(pathname: string): boolean {
  return pathname.startsWith('/onboarding') || pathname === '/recalibrate'
}

/**
 * macOS-only top bar. The native traffic lights sit inside it and dragging it moves the window.
 * Windows uses the caption buttons in TitleBar instead, so nothing is drawn there.
 */
export function MacTitleBar(): React.JSX.Element | null {
  const { pathname } = useLocation()
  if (!window.api.app.isMac) return null
  return (
    <div
      className={`shrink-0 ${isDarkScreen(pathname) ? 'bg-main1' : 'bg-main5'}`}
      style={{ height: MAC_TITLE_BAR_HEIGHT }}
      data-drag
    />
  )
}
