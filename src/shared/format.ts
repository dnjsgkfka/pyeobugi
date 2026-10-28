/** 화면 표기용 포맷. 숫자 가공은 전부 여기서 한다. */

/** 초 → "N시간 MM분". 1시간 미만이면 "N분", 1분 미만이면 "1분 미만" */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0분'
  const totalMinutes = Math.floor(seconds / 60)
  if (totalMinutes < 1) return '1분 미만'
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}분`
  return minutes === 0 ? `${hours}시간` : `${hours}시간 ${String(minutes).padStart(2, '0')}분`
}

/** 초 → 카드에 들어갈 숫자와 단위 쌍 */
export function durationParts(seconds: number): { value: string; unit: string }[] {
  const totalMinutes = Math.max(0, Math.floor(seconds / 60))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return [{ value: String(minutes), unit: '분' }]
  return [
    { value: String(hours), unit: '시간' },
    { value: String(minutes), unit: '분' }
  ]
}

/** 비율 → "82". 데이터가 없으면(null) 대시 */
export function formatRate(rate: number | null): string {
  return rate === null ? '–' : String(rate)
}

/** "2026-10-28T14:05:00+09:00" → "10월 28일 14:05" */
export function formatKstTime(iso: string): string {
  const match = /^\d{4}-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso)
  if (!match) return iso
  const [, month, day, hour, minute] = match
  return `${Number(month)}월 ${Number(day)}일 ${hour}:${minute}`
}

/** 몇 분 전인지. 캐시가 얼마나 묵었는지 보여줄 때 쓴다 */
export function formatAge(fromIso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - Date.parse(fromIso)
  if (!Number.isFinite(diffMs) || diffMs < 0) return '방금'
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return '방금'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  return `${Math.floor(hours / 24)}일 전`
}

/**
 * 어제와 비교한 문구.
 * @param unit 숫자 뒤에 붙는 말 ("%p", "회", "분")
 * @param up 늘었을 때 쓸 말 ("올랐어요", "늘었어요")
 * @param down 줄었을 때 쓸 말
 */
export function compareText(
  today: number | null,
  yesterday: number | null | undefined,
  unit: string,
  up: string,
  down: string
): string | null {
  if (today === null || yesterday === null || yesterday === undefined) return null
  const diff = today - yesterday
  if (diff === 0) return '어제와 같아요'
  return `어제보다 ${Math.abs(diff)}${unit} ${diff > 0 ? up : down}`
}

/** 0~23 시 → "오전 9시대" / "오후 2시대" / "저녁 7시대" */
export function hourBand(hour: number): string {
  if (hour < 12) return `오전 ${hour}시대`
  if (hour < 18) return `오후 ${hour - 12}시대`
  return `저녁 ${hour - 12}시대`
}

/** 거북목이 몰린 시간대 문구 */
export function peakText(hours: number[]): string {
  const bands = [...new Set(hours.map((hour) => hourBand(Math.floor(hour))))]
  if (bands.length === 0) return '오늘은 거북목이 없었어요'
  if (bands.length === 1) return `${bands[0]}에 몰려 있어요`
  return `${bands[0]}와 ${bands[1]}에 몰려 있어요`
}
