/** 축의 기본 폭(시간). 감지가 이보다 넓게 퍼져 있으면 늘린다 */
const SPAN = 10
/** 감지가 하나도 없을 때 보여 줄 구간 */
const EMPTY_START = 10
/** 양끝을 맞추는 단위(시간) */
const TICK = 2
/** 라벨은 이 개수를 넘지 않게 — 창이 넓어지면 눈금 간격을 벌린다 */
const MAX_LABELS = 6

const clampHour = (h: number): number => Math.min(24, Math.max(0, h))

/**
 * 보여 줄 구간을 정한다.
 * 끝은 '지금'(오늘을 보고 있을 때) 또는 그날 마지막 감지 중 늦은 쪽이고,
 * 거기서 10시간을 거슬러 올라간다. 첫 감지가 그보다 앞이면 그 앞까지 늘려
 * 점이 조용히 사라지지 않게 한다. 눈금을 맞추려고 양끝을 2시간 단위로 정렬한다.
 */
function windowOf(hours: number[], nowHour: number | null): { start: number; end: number } {
  if (hours.length === 0) {
    return { start: EMPTY_START, end: EMPTY_START + SPAN }
  }
  const last = Math.max(...hours, nowHour ?? 0)
  const end = clampHour(Math.ceil(last / TICK) * TICK)
  const first = Math.min(...hours)
  const start = clampHour(Math.min(end - SPAN, Math.floor(first / TICK) * TICK))
  // 끝이 왼쪽 끝에 닿아 폭이 모자라면 오른쪽으로 민다
  return end - start >= TICK ? { start, end } : { start, end: clampHour(start + SPAN) }
}

/**
 * 거북목 감지 시점. 가로 막대 위에 점으로 찍는다.
 * Figma: 카드 높이 113 (padding 16, 내용 gap 24 / 막대 4 / 라벨 사이 16)
 */
export function BadTimeline({
  hours,
  summary,
  nowHour = null
}: {
  /** 거북목이 감지된 시각 (0~23, 소수 가능) */
  hours: number[]
  summary: string
  /** 오늘을 보고 있으면 지금 시각(소수 가능), 과거 날짜면 null */
  nowHour?: number | null
}): React.JSX.Element {
  const { start, end } = windowOf(hours, nowHour)
  const span = end - start
  // 카드 폭은 그대로라 창이 넓어지면 점이 촘촘해진다. 라벨까지 늘어나면 빽빽해서
  // 안 읽히므로 눈금 간격을 벌린다 (10시간이면 2시간, 16시간이면 4시간)
  const tick = Math.max(TICK, Math.ceil(span / MAX_LABELS / TICK) * TICK)
  const labels: number[] = []
  for (let h = start; h <= end; h += tick) labels.push(h)
  if (labels[labels.length - 1] !== end) labels.push(end)

  return (
    <section className="flex flex-col gap-6 rounded-lg bg-white p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-body-b text-grey-900">거북목 감지 시점</span>
        <span className="text-label text-grey-700">
          {hours.length === 0 ? '감지된 거북목이 없어요' : summary}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        <div className="relative h-1 w-full rounded-lg bg-grey-300">
          {hours.map((hour, index) => {
            const ratio = (hour - start) / span
            if (ratio < 0 || ratio > 1) return null
            return (
              <span
                key={`${hour}-${index}`}
                className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-pill bg-main2"
                style={{ left: `${ratio * 100}%` }}
              />
            )
          })}
        </div>
        <div className="flex items-center justify-between">
          {labels.map((hour) => (
            <span key={hour} className="text-caption text-grey-700">
              {hour}시
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
