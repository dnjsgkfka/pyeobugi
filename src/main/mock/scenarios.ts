/** msw 를 불러오지 않는 가벼운 파일 — config 에서도 쓴다. */
export const SCENARIOS = [
  'ok',
  'empty',
  'rate_limited',
  'server_error',
  'offline',
  'payload_too_large'
] as const
export type Scenario = (typeof SCENARIOS)[number]

export function isScenario(value: unknown): value is Scenario {
  return typeof value === 'string' && (SCENARIOS as readonly string[]).includes(value)
}
