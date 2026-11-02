import { z } from 'zod'

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
const seconds = z.number().int().min(0)

/** Swagger PeriodSummary. day / yesterday / week / lastWeek 가 모두 같은 모양이다 */
const PeriodSummarySchema = z.object({
  postureKeepRate: rate,
  turtleNeckCount: seconds,
  pomodoroCount: seconds,
  usageSeconds: seconds
})
export type PeriodSummary = z.infer<typeof PeriodSummarySchema>

/** Swagger Distribution. 상태별 시간과 비율 */
const DistributionSchema = z.object({
  goodSeconds: seconds,
  mildSeconds: seconds,
  turtleSeconds: seconds,
  goodRate: rate,
  mildRate: rate,
  turtleRate: rate
})
export type Distribution = z.infer<typeof DistributionSchema>

/** Swagger TurtleNeckTimeline. occurredAt 은 감지 시각, peakHours 는 몰린 시간대 */
const TurtleNeckTimelineSchema = z.object({
  occurredAt: z.array(z.string()),
  peakHours: z.array(z.number().int().min(0).max(23))
})
export type TurtleNeckTimeline = z.infer<typeof TurtleNeckTimelineSchema>

/**
 * GET /api/reports/summary?date=YYYY-MM-DD  (date 생략 시 오늘, KST)
 *
 * 운영 Swagger(ReportSummaryResponse) 기준이다.
 * Swagger 에 required 표기가 없어서 모든 필드를 optional 로 받는다
 * — 빠져 있어도 화면이 죽지 않게 하고, 쓰는 쪽에서 없을 때를 처리한다.
 */
export const ReportSummarySchema = z.object({
  hasData: z.boolean(),
  generatedAt: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  day: PeriodSummarySchema,
  /** 어제 (어제보다 … 문구) */
  yesterday: PeriodSummarySchema.nullish(),
  /** 해당 날짜가 속한 주의 월요일 00:00 ~ 해당 날짜 */
  week: PeriodSummarySchema,
  lastWeek: PeriodSummarySchema.nullish(),
  /** 시간대별 정자세 비율. 기록 없는 시간은 빠지거나 null 로 온다 */
  hourly: z.array(z.object({ hour: z.number().int().min(0).max(23), postureKeepRate: rate })),
  turtleNeckTimeline: TurtleNeckTimelineSchema.nullish(),
  distribution: DistributionSchema.nullish(),
  comment: z.object({ message: z.string(), mood: z.enum(['GOOD', 'NORMAL', 'BAD']) }).nullish()
})
export type ReportSummary = z.infer<typeof ReportSummarySchema>

export const DeviceRegisterSchema = z.object({ deviceSecret: z.string().min(1) })
export type DeviceRegister = z.infer<typeof DeviceRegisterSchema>
