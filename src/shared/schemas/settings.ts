import { z } from 'zod'
import { kstIso } from './events'

/** 교정 강도: 0 느슨하게 / 1 보통 / 2 엄격하게 */
export const SensitivitySchema = z.union([z.literal(0), z.literal(1), z.literal(2)])
export type Sensitivity = z.infer<typeof SensitivitySchema>

/** Overlay turtle size step: 0 small / 1 medium / 2 large */
export const TurtleSizeSchema = z.union([z.literal(0), z.literal(1), z.literal(2)])
export type TurtleSize = z.infer<typeof TurtleSizeSchema>

/**
 * Max turtle size (px) for each step.
 * Medium keeps the previous default (120). The animation never draws below 80px.
 */
export const TURTLE_SIZE_PX: Record<TurtleSize, number> = { 0: 90, 1: 120, 2: 160 }

/**
 * 기기에 저장하는 설정 (settings.json).
 * 기준 자세(baseline)는 개인 데이터라 서버로 보내지 않는다.
 */
export const SettingsSchema = z.object({
  /** 온보딩(인트로 → 권한 → 기준 잡기)을 끝냈는가 */
  onboarded: z.boolean(),
  baseline: z.object({ pitch: z.number(), size: z.number(), savedAt: kstIso }).nullable(),
  sensitivity: SensitivitySchema,
  turtleSize: TurtleSizeSchema,
  features: z.object({
    studyTimer: z.boolean(),
    stretch: z.boolean(),
    awayPause: z.boolean(),
    overlay: z.boolean()
  })
})
export type Settings = z.infer<typeof SettingsSchema>

export const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  baseline: null,
  sensitivity: 1,
  turtleSize: 1,
  features: { studyTimer: false, stretch: true, awayPause: false, overlay: true }
}
