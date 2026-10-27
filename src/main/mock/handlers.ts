import { http, HttpResponse } from 'msw'
import {
  EventsRequestSchema,
  MAX_BODY_BYTES,
  MAX_EVENTS_PER_BATCH,
  validateEvent
} from '@shared/schemas/events'
import type { RejectedEvent, ReportSummary } from '@shared/schemas/responses'
import { isKstDateString, kstDateString, toKstIso } from '@shared/time'
import { isUuidV4 } from '../device'
import type { Scenario } from './scenarios'

/** 시나리오와 "이미 받은 eventId" 는 메모리에만 둔다. */
const state: { scenario: Scenario; seen: Set<string> } = { scenario: 'ok', seen: new Set() }

export function setScenario(scenario: Scenario): void {
  state.scenario = scenario
}

export function resetMock(): void {
  state.scenario = 'ok'
  state.seen.clear()
}

let traceCounter = 0
function error(status: number, code: string, extra: Record<string, unknown> = {}): Response {
  return HttpResponse.json(
    { code, message: `mock: ${code}`, traceId: `req-mock-${++traceCounter}`, ...extra },
    { status }
  )
}

/** 인프라 장애 시나리오는 두 엔드포인트가 같은 방식으로 응답한다. */
function failure(): Response | null {
  switch (state.scenario) {
    case 'offline':
      return HttpResponse.error()
    case 'rate_limited':
      return error(429, 'RATE_LIMITED', { retryAfter: 3 })
    case 'server_error':
      return error(500, 'INTERNAL_ERROR')
    default:
      return null
  }
}

function buildSummary(date: string): ReportSummary {
  const afternoon = [70, 75, 80, 85, 90, 82, 78, 88, 92]
  const hourly = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    postureKeepRate: hour >= 9 && hour < 18 ? afternoon[hour - 9] : null
  }))
  if (state.scenario === 'empty') {
    const none = { postureKeepRate: null, turtleNeckCount: 0, pomodoroCount: 0, usageSeconds: 0 }
    return {
      hasData: false,
      generatedAt: toKstIso(new Date()),
      date,
      day: none,
      week: none,
      hourly: hourly.map((h) => ({ ...h, postureKeepRate: null })),
      comment: null
    }
  }
  return {
    hasData: true,
    generatedAt: toKstIso(new Date()),
    date,
    day: { postureKeepRate: 82, turtleNeckCount: 5, pomodoroCount: 6, usageSeconds: 12600 },
    week: { postureKeepRate: 78, turtleNeckCount: 31, pomodoroCount: 22, usageSeconds: 71400 },
    hourly,
    comment: { message: '오늘 잘했어요', mood: 'GOOD' }
  }
}

export const handlers = [
  http.post('*/api/events', async ({ request }) => {
    const failed = failure()
    if (failed) return failed
    if (state.scenario === 'payload_too_large') return error(413, 'PAYLOAD_TOO_LARGE')

    const deviceId = request.headers.get('X-Device-Id')
    if (!isUuidV4(deviceId)) return error(400, 'DEVICE_ID_INVALID')

    const text = await request.text()
    if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
      return error(413, 'PAYLOAD_TOO_LARGE')
    }
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      return error(400, 'INVALID_REQUEST')
    }
    const body = EventsRequestSchema.safeParse(json)
    if (!body.success) return error(400, 'INVALID_REQUEST')
    if (body.data.events.length > MAX_EVENTS_PER_BATCH) return error(413, 'PAYLOAD_TOO_LARGE')

    let accepted = 0
    let duplicated = 0
    const rejected: RejectedEvent[] = []
    body.data.events.forEach((raw, index) => {
      const result = validateEvent(raw)
      if (!result.ok) {
        const id =
          typeof raw === 'object' && raw !== null
            ? (raw as { eventId?: unknown }).eventId
            : undefined
        rejected.push({ index, ...(isUuidV4(id) ? { eventId: id } : {}), code: result.code })
        return
      }
      // 같은 eventId 는 내용이 달라도 덮어쓰지 않고 duplicated
      const key = `${deviceId}:${result.event.eventId}`
      if (state.seen.has(key)) duplicated++
      else {
        state.seen.add(key)
        accepted++
      }
    })
    return HttpResponse.json({ accepted, duplicated, rejected })
  }),

  http.get('*/api/reports/summary', ({ request }) => {
    const failed = failure()
    if (failed) return failed

    if (!isUuidV4(request.headers.get('X-Device-Id'))) return error(400, 'DEVICE_ID_INVALID')
    const date = new URL(request.url).searchParams.get('date') ?? kstDateString(new Date())
    if (!isKstDateString(date)) return error(400, 'INVALID_REQUEST')
    return HttpResponse.json(buildSummary(date), { headers: { 'Cache-Control': 'no-store' } })
  })
]
