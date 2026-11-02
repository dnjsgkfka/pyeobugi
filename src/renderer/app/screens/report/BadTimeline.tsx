const START_HOUR = 10
const END_HOUR = 20

/**
 * 거북목 감지 시점. 가로 막대 위에 점으로 찍는다.
 * Figma: 카드 높이 113 (padding 16, 내용 gap 24 / 막대 4 / 라벨 사이 16)
 */
export function BadTimeline({
  hours,
  summary
}: {
  /** 거북목이 감지된 시각 (0~23, 소수 가능) */
  hours: number[]
  summary: string
}): React.JSX.Element {
  const span = END_HOUR - START_HOUR
  const labels = Array.from({ length: span / 2 + 1 }, (_, i) => START_HOUR + i * 2)

  return (
    <section className="flex flex-col gap-6 rounded-lg bg-white p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-label-b text-grey-900">거북목 감지 시점</span>
        <span className="text-label text-grey-700">{summary}</span>
      </div>

      <div className="flex flex-col gap-4">
        <div className="relative h-1 w-full rounded-lg bg-grey-300">
          {hours.map((hour, index) => {
            const ratio = (hour - START_HOUR) / span
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
