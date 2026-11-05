import { type AppEvent } from '@shared/schemas/events'
import {
  DeviceRegisterSchema,
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
      reason: 'rate_limited' | 'server_error' | 'offline' | 'bad_response' | 'device_secret_invalid'
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

/** `registerDevice` 결과 */
export type RegisterResult =
  /** 등록 성공 → secret 을 저장한다 */
  | { kind: 'ok'; deviceSecret: string }
  /** 409: 서버에는 이미 등록된 기기 ID. 로컬에 secret 이 없으면 기록을 포기하고 새 ID 로 다시 등록한다 */
  | { kind: 'already' }
  /** 404 / 405: 서버에 아직 등록 엔드포인트가 없다 (BE 머지 전) → secret 없이 진행 */
  | { kind: 'unavailable' }
  /** 네트워크·5xx·429 → 다음 실행이나 다음 호출에서 다시 시도 */
  | { kind: 'retry'; reason: 'offline' | 'server_error' | 'rate_limited' | 'bad_response' }
  | { kind: 'error'; status: number; code?: string }

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
        | 'device_secret_invalid'
        | 'unexpected_status'
      retryAfterSec?: number
      traceId?: string
    }

export interface ApiClient {
  postEvents: (events: AppEvent[]) => Promise<PostEventsResult>
  /** @param date `YYYY-MM-DD` (KST). 생략하면 오늘 */
  getReportSummary: (date?: string) => Promise<ReportResult>
  /** 기기 등록. 최초 실행에 1 회, 401 을 받았을 때 1 회 */
  registerDevice: () => Promise<RegisterResult>
}

export interface ApiClientOptions {
  /** 예: `https://example.com/api` (끝에 `/` 없이) */
  baseUrl: string
  /** 함수로 받는다 — 409 로 기기 ID 가 바뀔 수 있다 */
  deviceId: string | (() => string)
  /** 등록해서 받아 둔 secret. 아직 없으면 null */
  deviceSecret?: () => string | null
  /**
   * 401 `DEVICE_SECRET_INVALID` 을 받았을 때 부른다.
   * 다시 등록해서 secret 을 갖췄으면 true → 그 요청을 한 번 더 보낸다.
   */
  onUnauthorized?: () => Promise<boolean>
  fetchImpl?: typeof fetch
  timeoutMs?: number
  /** 요청 본문은 절대 남기지 않는다. code / traceId 같은 식별 정보만. */
  onError?: (message: string, info?: Record<string, unknown>) => void
}

type Raw =
  | { type: 'network' }
  /** retryAfterHeaderSec: 본문에 retryAfter 가 없을 때 쓰는 Retry-After 헤더 값 (초) */
  | { type: 'http'; status: number; body: unknown; retryAfterHeaderSec?: number }

export function createApiClient(options: ApiClientOptions): ApiClient {
  const { baseUrl, timeoutMs = 10_000 } = options
  const currentDeviceId =
    typeof options.deviceId === 'function' ? options.deviceId : () => options.deviceId as string
  const currentSecret = options.deviceSecret ?? ((): string | null => null)
  // 만들 때의 fetch 를 붙잡지 않고 호출할 때마다 현재 전역 fetch 를 쓴다 (mock 이 나중에 가로채도 동작)
  const fetchImpl: typeof fetch = options.fetchImpl ?? ((input, init) => fetch(input, init))
  const onError =
    options.onError ?? ((message, info): void => console.error(`[api] ${message}`, info ?? ''))

  async function once(path: string, init: RequestInit = {}): Promise<Raw> {
    const secret = currentSecret()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Device-Id': currentDeviceId()
    }
    // 서버가 아직 모르는 헤더면 무시한다 → BE 머지 전에도 그대로 동작한다
    if (secret) headers['X-Device-Secret'] = secret
    try {
      const res = await fetchImpl(`${baseUrl}${path}`, {
        ...init,
        headers,
        signal: AbortSignal.timeout(timeoutMs)
      })
      let body: unknown = null
      try {
        body = await res.json()
      } catch {
        body = null
      }
      return { type: 'http', status: res.status, body, retryAfterHeaderSec: retryAfterOf(res) }
    } catch {
      // 연결 실패, DNS 실패, 타임아웃 → 전부 오프라인으로 본다
      return { type: 'network' }
    }
  }

  /** 401 이면 다시 등록해 보고, 갖춰졌으면 같은 요청을 한 번만 더 보낸다 */
  async function send(path: string, init: RequestInit = {}): Promise<Raw> {
    const raw = await once(path, init)
    if (raw.type !== 'http' || raw.status !== 401 || !options.onUnauthorized) return raw
    const ready = await options.onUnauthorized()
    return ready ? once(path, init) : raw
  }

  async function registerDevice(): Promise<RegisterResult> {
    const raw = await once('/devices/register', { method: 'POST' })
    if (raw.type === 'network') return { kind: 'retry', reason: 'offline' }

    const { status, body } = raw
    if (status === 200) {
      const parsed = DeviceRegisterSchema.safeParse(body)
      if (!parsed.success) {
        onError('invalid register response shape')
        return { kind: 'retry', reason: 'bad_response' }
      }
      return { kind: 'ok', deviceSecret: parsed.data.deviceSecret }
    }
    if (status === 409) return { kind: 'already' }
    // BE 인증 PR 머지 전에는 엔드포인트가 없다
    if (status === 404 || status === 405) return { kind: 'unavailable' }
    if (status === 429) return { kind: 'retry', reason: 'rate_limited' }
    if (status >= 500) return { kind: 'retry', reason: 'server_error' }
    const { code, traceId } = errorInfo(body)
    onError('register failed', { status, code, traceId })
    return { kind: 'error', status, code }
  }

  /** Retry-After 는 초 또는 HTTP 날짜로 온다 */
  function retryAfterOf(res: Response): number | undefined {
    const raw = res.headers.get('Retry-After')
    if (!raw) return undefined
    const seconds = Number(raw)
    if (Number.isFinite(seconds)) return seconds > 0 ? Math.ceil(seconds) : undefined
    const at = Date.parse(raw)
    if (Number.isNaN(at)) return undefined
    const left = Math.ceil((at - Date.now()) / 1000)
    return left > 0 ? left : undefined
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

    const { code, traceId, retryAfterSec: fromBody } = errorInfo(body)
    const retryAfterSec = fromBody ?? raw.retryAfterHeaderSec
    if (status === 413) {
      if (events.length > 1) return { kind: 'split' }
      onError('single event too large, discarding', { code, traceId })
      return { kind: 'discard', reason: 'payload_too_large', traceId }
    }
    if (status === 429) return { kind: 'retry', reason: 'rate_limited', retryAfterSec }
    if (status >= 500) return { kind: 'retry', reason: 'server_error' }
    if (status === 401) {
      // 등록을 못 갖춘 상태 → 큐에 남겨 두고 조용히 다시 시도한다 (사용자에게는 알리지 않는다)
      onError('events rejected: device secret invalid', { code, traceId })
      return { kind: 'retry', reason: 'device_secret_invalid' }
    }

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

    const { code, traceId, retryAfterSec: fromBody } = errorInfo(body)
    const retryAfterSec = fromBody ?? raw.retryAfterHeaderSec
    onError('report request failed', { status, code, traceId })
    if (status === 429) return { kind: 'error', reason: 'rate_limited', retryAfterSec, traceId }
    if (status >= 500) return { kind: 'error', reason: 'server_error', traceId }
    if (status === 401) return { kind: 'error', reason: 'device_secret_invalid', traceId }
    if (status === 400) {
      const reason = code === 'DEVICE_ID_INVALID' ? 'device_id_invalid' : 'invalid_request'
      return { kind: 'error', reason, traceId }
    }
    return { kind: 'error', reason: 'unexpected_status', traceId }
  }

  return { postEvents, getReportSummary, registerDevice }
}
