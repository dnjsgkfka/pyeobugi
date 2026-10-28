import { useCallback, useState } from 'react'

/** 토스트 하나를 띄웠다 지우는 훅 */
export function useToast(): {
  message: string | null
  show: (message: string) => void
  dismiss: () => void
} {
  const [message, setMessage] = useState<string | null>(null)
  const show = useCallback((next: string) => setMessage(next), [])
  const dismiss = useCallback(() => setMessage(null), [])
  return { message, show, dismiss }
}
