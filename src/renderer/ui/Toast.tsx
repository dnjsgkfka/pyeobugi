import { useEffect } from 'react'

const DURATION_MS = 5_000

/**
 * 통신 실패 알림. 5초 뒤 사라진다.
 * 이벤트 전송 실패에는 쓰지 않는다 (사용자가 알 필요 없는 백그라운드 동작).
 */
export function Toast({
  message,
  onDismiss
}: {
  message: string
  onDismiss: () => void
}): React.JSX.Element {
  useEffect(() => {
    const timer = setTimeout(onDismiss, DURATION_MS)
    return () => clearTimeout(timer)
  }, [message, onDismiss])

  return (
    <div
      role="status"
      className="text-body fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-md bg-main1 px-5 py-3 text-main5 shadow-card"
    >
      {message}
    </div>
  )
}
