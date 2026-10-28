import { useCallback, useEffect, useState } from 'react'
import type { ReportView } from '@shared/report'

export type ReportState = { status: 'loading' } | { status: 'ready'; view: ReportView }

/**
 * 리포트를 불러온다.
 * main 이 구간 마감 → 큐 flush(최대 2초) → GET 순서로 처리하고 결과만 돌려준다.
 */
export function useReport(date?: string): {
  state: ReportState
  reload: () => void
  reloading: boolean
} {
  const [state, setState] = useState<ReportState>({ status: 'loading' })
  const [reloading, setReloading] = useState(false)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let alive = true
    void window.api.report.get(date).then((view) => {
      if (!alive) return
      setState({ status: 'ready', view })
      setReloading(false)
    })
    return () => {
      alive = false
    }
  }, [date, nonce])

  const reload = useCallback(() => {
    setReloading(true)
    setNonce((n) => n + 1)
  }, [])

  return { state, reload, reloading }
}
