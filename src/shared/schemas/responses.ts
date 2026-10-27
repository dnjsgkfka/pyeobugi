import { z } from 'zod'
import { kstIso } from './events'

export const ErrorResponseSchema = z.object({
  code: z.string(),
  message: z.string().optional(),
  traceId: z.string().optional(),
  /** 429 RATE_LIMITED 일 때, 초 단위 */
  retryAfter: z.number().int().positive().optional()
})
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>

export const RejectedEventSchema = z.object({
  index: z.number().int().min(0),
  eventId: z.string().optional(),
  code: z.enum(['INVALID_PAYLOAD', 'FORBIDDEN_FIELD', 'UNKNOWN_TYPE', 'OCCURRED_AT_OUT_OF_RANGE'])
})
export type RejectedEvent = z.infer<typeof RejectedEventSchema>

export const EventsResponseSchema = z.object({
  accepted: z.number().int().min(0),
  duplicated: z.number().int().min(0),
  rejected: z.array(RejectedEventSchema)
})
export type EventsResponse = z.infer<typeof EventsResponseSchema>

const rate = z.number().int().min(0).max(100).nullable()

const StatsSchema = z.object({
  postureKeepRate: rate,
  turtleNeckCount: z.number().int().min(0),
  pomodoroCount: z.number().int().min(0),
  usageSeconds: z.number().int().min(0)
})

/**
 * GET /api/reports/summary?date=YYYY-MM-DD  (date 생략 시 오늘, KST)
 * - day: 해당 날짜 / week: 해당 날짜가 속한 주(월요일 00:00 ~ 해당 날짜)
 * - hourly: 해당 날짜의 시간대별 정자세 비율 24칸 (사용 기록 없는 시간은 null)
 */
export const ReportSummarySchema = z.object({
  hasData: z.boolean(),
  generatedAt: kstIso,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  day: StatsSchema,
  week: StatsSchema,
  hourly: z
    .array(z.object({ hour: z.number().int().min(0).max(23), postureKeepRate: rate }))
    .length(24),
  comment: z.object({ message: z.string(), mood: z.enum(['GOOD', 'NORMAL', 'BAD']) }).nullable()
})
export type ReportSummary = z.infer<typeof ReportSummarySchema>
