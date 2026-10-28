import { barTone } from '@renderer/ui/state'
import type { ReportSummary } from '@shared/schemas/responses'

/** 막대 최대 높이 (Figma: 80% 초과 막대가 280px) */
const MAX_BAR = 280
const MIN_BAR = 4
/** 화면에 보여줄 시간 수 (Figma: 6칸) */
const VISIBLE_HOURS = 6

const LEGEND = [
  { label: '80% 이상', tone: 'bg-main4' },
  { label: '70 ~ 80%', tone: 'bg-main3' },
  { label: '70% 미만', tone: 'bg-main2' }
]

/** Chart/Legend Item — span 10×10 radius 2, gap 6, Label/14 Regular grey-700 */
function LegendItem({ label, tone }: { label: string; tone: string }): React.JSX.Element {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`size-2.5 rounded-xs ${tone}`} />
      <span className="text-label text-grey-700">{label}</span>
    </span>
  )
}

/** 시간대별 정자세 비율. 기록이 있는 시간 중 최근 6시간만 그린다. */
export function HourlyChart({ hourly }: { hourly: ReportSummary['hourly'] }): React.JSX.Element {
  const bars = hourly.filter((h) => h.postureKeepRate !== null).slice(-VISIBLE_HOURS)

  return (
    <section className="flex flex-1 flex-col justify-between rounded-lg bg-white p-4 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="text-body-b text-grey-900">시간대별 정자세 비율</h2>
        <div className="flex items-center gap-4">
          {LEGEND.map((item) => (
            <LegendItem key={item.label} {...item} />
          ))}
        </div>
      </div>

      <div className="flex items-end gap-1">
        {bars.map(({ hour, postureKeepRate }) => {
          const rate = postureKeepRate as number
          return (
            <div key={hour} className="flex flex-1 flex-col justify-end gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-body text-center text-grey-900">{rate}</span>
                <div
                  className={`w-full rounded-lg ${barTone(rate)}`}
                  style={{ height: Math.max(MIN_BAR, Math.round((rate / 100) * MAX_BAR)) }}
                />
              </div>
              <span className="text-caption text-center text-grey-700">{hour}시</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
