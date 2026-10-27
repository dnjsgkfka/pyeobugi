import { type AppEvent } from '@shared/schemas/events'
import {
  ErrorResponseSchema,
  EventsResponseSchema,
  ReportSummarySchema,
  type RejectedEvent,
  type ReportSummary
} from '@shared/schemas/responses'

/** `postEvents` 결과. 호출한 쪽(큐)은 kind 만 보고 행동하면 된다. */
export type PostEventsResult =
  /** 처리 끝. accepted + duplicated 는 큐에서 제거, rejected 는 재시도 없이 폐기 */
  | { kind: 'done'; accepted: number; duplicated: number; rejected: RejectedEvent[] }
  /** 큐 유지 + 백오프 재시도 */
  | {
      kind: 'retry'
      reason: 'rate_limited' | 'server_error' | 'offline' | 'bad_response'
      retryAfterSec?: number
    }
  /** 배치가 너무 큼 → 반으로 쪼개 다시 보내기 */
  | { kind: 'split' }
  /** 다시 보내도 소용없음 → 이 배치는 폐기 */
  | {
      kind: 'discard'
      reason: 'invalid_request' | 'device_id_invalid' | 'payload_too_large' | 'unexpected_status'
      traceId?: string
    }

export type ReportResult =
  | { kind: 'ok'; data: ReportSummary }
  | {
      kind: 'error'
      reason:
        | 'offline'
        | 'rate_limited'
        | 'server_error'
        | 'bad_response'
        | 'invalid_request'
        | 'device_id_invalid'
        | 'unexpected_status'
      retryAfterSec?: number
      traceId?: string
    }

export interface ApiClient {
  postEvents: (events: AppEvent[]) => Promise<PostEventsResult>
  /** @param date `YYYY-MM-DD` (KST). 생략하면 오늘 */
  getReportSummary: (date?: string) => Promise<ReportResult>
}

export interface ApiClientOptions {
  /** 예: `https://example.com/api` (끝에 `/` 없이) */
  baseUrl: string
  deviceId: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
  /** 요청 본문은 절대 남기지 않는다. code / traceId 같은 식별 정보만. */
  onError?: (message: string, info?: Record<string, unknown>) => void
}

type Raw = { type: 'network' } | { type: 'http'; status: number; body: unknown }

export function createApiClient(options: ApiClientOptions): ApiClient {
  const { baseUrl, deviceId, fetchImpl = fetch, timeoutMs = 10_000 } = options
  const onError =
    options.onError ?? ((message, info): void => console.error(`[api] ${message}`, info ?? ''))

  async function send(path: string, init: RequestInit = {}): Promise<Raw> {
    try {
      const res = await fetchImpl(`${baseUrl}${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', 'X-Device-Id': deviceId },
        signal: AbortSignal.timeout(timeoutMs)
      })
      let body: unknown = null
      try {
        body = await res.json()
      } catch {
        body = null
      }
      return { type: 'http', status: res.status, body }
    } catch {
      // 연결 실패, DNS 실패, 타임아웃 → 전부 오프라인으로 본다
      return { type: 'network' }
    }
  }

  function errorInfo(body: unknown): { code?: string; traceId?: string; retryAfterSec?: number } {
    const parsed = ErrorResponseSchema.safeParse(body)
    if (!parsed.success) return {}
    return {
      code: parsed.data.code,
      traceId: parsed.data.traceId,
      retryAfterSec: parsed.data.retryAfter
    }
  }

  async function postEvents(events: AppEvent[]): Promise<PostEventsResult> {
    const raw = await send('/events', { method: 'POST', body: JSON.stringify({ events }) })
    if (raw.type === 'network') return { kind: 'retry', reason: 'offline' }

    const { status, body } = raw
    if (status === 200) {
      const parsed = EventsResponseSchema.safeParse(body)
      if (!parsed.success) {
        // 저장됐는지 알 수 없다 → 재전송해도 eventId 로 중복 처리되므로 안전하다
        onError('invalid events response shape')
        return { kind: 'retry', reason: 'bad_response' }
      }
      const { accepted, duplicated, rejected } = parsed.data
      if (accepted + duplicated + rejected.length !== events.length) {
        onError('response count does not match request', {
          sent: events.length,
          accepted,
          duplicated
        })
      }
      for (const r of rejected) onError('event rejected', { ...r })
      return { kind: 'done', accepted, duplicated, rejected }
    }

    const { code, traceId, retryAfterSec } = errorInfo(body)
    if (status === 413) {
      if (events.length > 1) return { kind: 'split' }
      onError('single event too large, discarding', { code, traceId })
      return { kind: 'discard', reason: 'payload_too_large', traceId }
    }
    if (status === 429) return { kind: 'retry', reason: 'rate_limited', retryAfterSec }
    if (status >= 500) return { kind: 'retry', reason: 'server_error' }

    if (status === 400) {
      const reason = code === 'DEVICE_ID_INVALID' ? 'device_id_invalid' : 'invalid_request'
      onError('request rejected', { status, code, traceId })
      return { kind: 'discard', reason, traceId }
    }
    onError('unexpected response', { status, code, traceId })
    return { kind: 'discard', reason: 'unexpected_status', traceId }
  }

  async function getReportSummary(date?: string): Promise<ReportResult> {
    const query = date ? `?date=${encodeURIComponent(date)}` : ''
    const raw = await send(`/reports/summary${query}`)
    if (raw.type === 'network') return { kind: 'error', reason: 'offline' }

    const { status, body } = raw
    if (status === 200) {
      const parsed = ReportSummarySchema.safeParse(body)
      if (!parsed.success) {
        onError('invalid report response shape')
        return { kind: 'error', reason: 'bad_response' }
      }
      return { kind: 'ok', data: parsed.data }
    }

    const { code, traceId, retryAfterSec } = errorInfo(body)
    onError('report request failed', { status, code, traceId })
    if (status === 429) return { kind: 'error', reason: 'rate_limited', retryAfterSec, traceId }
    if (status >= 500) return { kind: 'error', reason: 'server_error', traceId }
    if (status === 400) {
      const reason = code === 'DEVICE_ID_INVALID' ? 'device_id_invalid' : 'invalid_request'
      return { kind: 'error', reason, traceId }
    }
    return { kind: 'error', reason: 'unexpected_status', traceId }
  }

  return { postEvents, getReportSummary }
}
