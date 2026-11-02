/** msw 를 불러오지 않는 가벼운 파일 — config 에서도 쓴다. */
export const SCENARIOS = [
  'ok',
  'empty',
  'rate_limited',
  'server_error',
  'offline',
  'payload_too_large',
  /** 등록 엔드포인트가 아직 없는 서버 (BE 머지 전) */
  'register_unavailable',
  /** 기기 secret 을 거부하는 서버 — 401 → 재등록 흐름 확인 */
  'secret_invalid'
] as const
export type Scenario = (typeof SCENARIOS)[number]

export function isScenario(value: unknown): value is Scenario {
  return typeof value === 'string' && (SCENARIOS as readonly string[]).includes(value)
}
