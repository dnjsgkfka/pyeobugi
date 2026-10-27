import { z } from 'zod'
import { kstDateString, kstNextMidnight } from '../time'

/**
 * POST /api/events 의 이벤트 스키마.
 * 모든 객체는 strict(화이트리스트): 정의되지 않은 필드가 있으면 거부한다.
 * (pitch, 얼굴 크기, 기준값, 슬라이더 값 같은 개인 데이터는 절대 서버로 보내지 않는다)
 */

const uuidV4 = z.uuidv4()

const KST_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/
export const kstIso = z
  .string()
  .regex(KST_ISO, 'KST(+09:00) ISO 8601 형식이어야 해요')
  .refine((s) => !Number.isNaN(Date.parse(s)), '올바른 시각이 아니에요')

const base = {
  eventId: uuidV4,
  sessionId: uuidV4,
  occurredAt: kstIso
}

const emptyPayload = z.strictObject({})

const usageSegmentPayload = z.strictObject({
  startedAt: kstIso,
  endedAt: kstIso,
  durationSec: z.number().int().min(0).max(3600),
  badDurationSec: z.number().int().min(0)
})

export const BUBBLE_TYPES = ['POSTURE', 'STRETCH', 'TIMER_BREAK', 'ENCOURAGE', 'GREETING'] as const
export const SEVERITIES = ['MILD', 'MODERATE', 'SEVERE'] as const

const usageSegment = z
  .strictObject({
    ...base,
    type: z.literal('USAGE_SEGMENT'),
    payload: usageSegmentPayload
  })
  .superRefine((event, ctx) => {
    const { startedAt, endedAt, durationSec, badDurationSec } = event.payload
    const start = Date.parse(startedAt)
    const end = Date.parse(endedAt)
    const issue = (message: string): void =>
      ctx.addIssue({ code: 'custom', message, path: ['payload'] })

    if (badDurationSec > durationSec) issue('badDurationSec 가 durationSec 보다 클 수 없어요')
    if (!(start < end)) issue('startedAt 은 endedAt 보다 앞이어야 해요')
    else {
      const sameDay = kstDateString(new Date(start)) === kstDateString(new Date(end))
      const endsAtMidnight = end === kstNextMidnight(new Date(start)).getTime()
      if (!sameDay && !endsAtMidnight) issue('구간이 KST 날짜 경계를 넘을 수 없어요')
      if (Math.abs(durationSec - (end - start) / 1000) > 1) {
        issue('durationSec 가 endedAt - startedAt 과 달라요')
      }
    }
    if (event.occurredAt !== endedAt) {
      ctx.addIssue({
        code: 'custom',
        message: 'occurredAt 은 endedAt 과 같아야 해요',
        path: ['occurredAt']
      })
    }
  })

export const EventSchema = z.discriminatedUnion('type', [
  z.strictObject({ ...base, type: z.literal('SESSION_START'), payload: emptyPayload }),
  z.strictObject({ ...base, type: z.literal('SESSION_END'), payload: emptyPayload }),
  usageSegment,
  z.strictObject({
    ...base,
    type: z.literal('POSTURE_BAD'),
    payload: z.strictObject({ severity: z.enum(SEVERITIES) })
  }),
  z.strictObject({ ...base, type: z.literal('POMODORO_COMPLETED'), payload: emptyPayload }),
  z.strictObject({
    ...base,
    type: z.literal('CALIBRATION_COMPLETED'),
    payload: z.strictObject({ isRecalibration: z.boolean() })
  }),
  z.strictObject({
    ...base,
    type: z.literal('BUBBLE_SHOWN'),
    payload: z.strictObject({ bubbleType: z.enum(BUBBLE_TYPES) })
  }),
  z.strictObject({
    ...base,
    type: z.literal('SETTINGS_CHANGED'),
    payload: z.strictObject({
      studyTimer: z.boolean(),
      stretch: z.boolean(),
      awayPause: z.boolean(),
      overlay: z.boolean()
    })
  })
])

export type AppEvent = z.infer<typeof EventSchema>
export type EventType = AppEvent['type']

export const EVENT_TYPES: readonly string[] = [
  'SESSION_START',
  'SESSION_END',
  'USAGE_SEGMENT',
  'POSTURE_BAD',
  'POMODORO_COMPLETED',
  'CALIBRATION_COMPLETED',
  'BUBBLE_SHOWN',
  'SETTINGS_CHANGED'
]

/** 요청 body 최상위. events 개수(1~100) / 크기(64KB) 는 서버가 413 으로 처리한다. */
export const EventsRequestSchema = z.strictObject({ events: z.array(z.unknown()).min(1) })

export const MAX_EVENTS_PER_BATCH = 100
export const MAX_BODY_BYTES = 64 * 1024

export type EventRejectCode =
  'INVALID_PAYLOAD' | 'FORBIDDEN_FIELD' | 'UNKNOWN_TYPE' | 'OCCURRED_AT_OUT_OF_RANGE'

export type ValidateResult = { ok: true; event: AppEvent } | { ok: false; code: EventRejectCode }

const FUTURE_LIMIT_MS = 5 * 60 * 1000
const PAST_LIMIT_MS = 30 * 24 * 60 * 60 * 1000

function inRange(iso: string, now: number): boolean {
  const t = Date.parse(iso)
  return t <= now + FUTURE_LIMIT_MS && t >= now - PAST_LIMIT_MS
}

/** 이벤트 1개를 서버와 같은 규칙으로 검증하고 거부 사유를 분류한다. */
export function validateEvent(input: unknown, now: Date = new Date()): ValidateResult {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, code: 'INVALID_PAYLOAD' }
  }
  const type = (input as { type?: unknown }).type
  if (typeof type !== 'string') return { ok: false, code: 'INVALID_PAYLOAD' }
  if (!EVENT_TYPES.includes(type)) return { ok: false, code: 'UNKNOWN_TYPE' }

  const parsed = EventSchema.safeParse(input)
  if (!parsed.success) {
    // 개인정보성 필드가 섞였는지를 다른 오류보다 먼저 가려낸다.
    const forbidden = parsed.error.issues.some((i) => i.code === 'unrecognized_keys')
    return { ok: false, code: forbidden ? 'FORBIDDEN_FIELD' : 'INVALID_PAYLOAD' }
  }

  const event = parsed.data
  const times = [event.occurredAt]
  if (event.type === 'USAGE_SEGMENT') times.push(event.payload.startedAt, event.payload.endedAt)
  if (!times.every((t) => inRange(t, now.getTime()))) {
    return { ok: false, code: 'OCCURRED_AT_OUT_OF_RANGE' }
  }
  return { ok: true, event }
}
