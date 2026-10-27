/** KST(+09:00) 시각 유틸. 서버와 주고받는 시각은 항상 `2026-10-04T09:22:00+09:00` 형식. */

export const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** 초 단위로 버림해 KST ISO 문자열로 만든다. */
export function toKstIso(date: Date): string {
  const k = new Date(date.getTime() + KST_OFFSET_MS)
  return (
    `${k.getUTCFullYear()}-${pad(k.getUTCMonth() + 1)}-${pad(k.getUTCDate())}` +
    `T${pad(k.getUTCHours())}:${pad(k.getUTCMinutes())}:${pad(k.getUTCSeconds())}+09:00`
  )
}

/** KST 기준 날짜 `YYYY-MM-DD` */
export function kstDateString(date: Date): string {
  return toKstIso(date).slice(0, 10)
}

export function floorToSecond(date: Date): Date {
  return new Date(Math.floor(date.getTime() / 1000) * 1000)
}

/** 해당 시각이 속한 KST 날짜의 00:00 */
export function kstStartOfDay(date: Date): Date {
  const shifted = date.getTime() + KST_OFFSET_MS
  return new Date(Math.floor(shifted / DAY_MS) * DAY_MS - KST_OFFSET_MS)
}

/** 다음 KST 자정 */
export function kstNextMidnight(date: Date): Date {
  return new Date(kstStartOfDay(date).getTime() + DAY_MS)
}

/** 해당 시각이 속한 주의 월요일 00:00 (KST) */
export function kstWeekStart(date: Date): Date {
  const day = new Date(date.getTime() + KST_OFFSET_MS).getUTCDay() // 0=일
  const sinceMonday = (day + 6) % 7
  return new Date(kstStartOfDay(date).getTime() - sinceMonday * DAY_MS)
}

/** `YYYY-MM-DD` 형식이고 실제 존재하는 날짜인가 */
export function isKstDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const t = Date.parse(`${value}T00:00:00+09:00`)
  return !Number.isNaN(t) && kstDateString(new Date(t)) === value
}

export interface TimeRange {
  start: Date
  end: Date
}

/** 하나의 구간이 KST 자정을 넘으면 자정 기준으로 나눈다. (USAGE_SEGMENT 는 날짜 경계를 넘지 않음) */
export function splitAtKstMidnight(start: Date, end: Date): TimeRange[] {
  const result: TimeRange[] = []
  let cursor = start
  while (cursor.getTime() < end.getTime()) {
    const midnight = kstNextMidnight(cursor)
    const segmentEnd = midnight.getTime() < end.getTime() ? midnight : end
    result.push({ start: cursor, end: segmentEnd })
    cursor = segmentEnd
  }
  return result
}
