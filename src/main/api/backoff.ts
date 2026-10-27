const BASE_MS = 2_000
const MAX_MS = 5 * 60_000

/** 지수 백오프. 서버가 `retryAfter` 를 주면 그보다 일찍 재시도하지 않는다. */
export function backoffMs(attempt: number, retryAfterSec?: number): number {
  const exp = Math.min(BASE_MS * 2 ** Math.max(0, attempt), MAX_MS)
  return Math.max(exp, (retryAfterSec ?? 0) * 1000)
}
