import { IconChevron } from '@renderer/ui/icons'
import { kstDateString } from '@shared/time'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** 그 달 1일이 속한 주의 일요일부터 5주(35칸) */
function monthGrid(year: number, month: number): Date[] {
  const first = new Date(Date.UTC(year, month, 1))
  const start = new Date(first)
  start.setUTCDate(1 - first.getUTCDay())
  return Array.from({ length: 35 }, (_, i) => {
    const day = new Date(start)
    day.setUTCDate(start.getUTCDate() + i)
    return day
  })
}

/** UTC 로 만든 날짜를 그대로 `YYYY-MM-DD` 로 */
function key(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Date/Calendar — 폭 276(7×36 + 6×4), padding 16px 8px, gap 16.
 * 날짜 상태: 오늘 / 기록 있음 / 기록 없음 / 이전 달.
 */
export function Calendar({
  selected,
  recorded,
  onSelect,
  month,
  onMonthChange
}: {
  /** `YYYY-MM-DD` */
  selected: string
  /** 기록이 있는 날짜들 */
  recorded: Set<string>
  onSelect: (date: string) => void
  /** 보고 있는 달의 1일 */
  month: Date
  onMonthChange: (month: Date) => void
}): React.JSX.Element {
  const year = month.getUTCFullYear()
  const monthIndex = month.getUTCMonth()
  const today = kstDateString(new Date())

  function step(delta: number): void {
    onMonthChange(new Date(Date.UTC(year, monthIndex + delta, 1)))
  }

  // 아직 오지 않은 날은 기록이 있을 수 없다 → 고를 수 없고, 다음 달로도 넘어가지 않는다
  const atCurrentMonth = `${year}-${String(monthIndex + 1).padStart(2, '0')}` >= today.slice(0, 7)

  return (
    <div className="flex flex-col gap-4 rounded-lg bg-white px-2 py-4 shadow-[4px_4px_24px_0_rgba(26,40,46,0.12)]">
      <div className="flex h-5 w-[276px] items-center justify-between">
        <button
          type="button"
          className="flex w-9 justify-center"
          onClick={() => step(-1)}
          aria-label="이전 달"
        >
          <IconChevron className="rotate-180 text-grey-900" />
        </button>
        <span className="text-label-b text-grey-900">
          {year}년 {monthIndex + 1}월
        </span>
        <button
          type="button"
          className="flex w-9 justify-center disabled:opacity-30"
          disabled={atCurrentMonth}
          onClick={() => step(1)}
          aria-label="다음 달"
        >
          <IconChevron className="text-grey-900" />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex h-5 items-center gap-1">
          {WEEKDAYS.map((day) => (
            <span key={day} className="text-caption w-9 text-center text-grey-500">
              {day}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {monthGrid(year, monthIndex).map((date) => {
            const id = key(date)
            const outside = date.getUTCMonth() !== monthIndex
            const future = id > today
            const isToday = id === today
            const hasRecord = recorded.has(id)
            const tone =
              outside || future
                ? 'text-label text-grey-300'
                : isToday
                  ? 'text-label bg-main2 text-white'
                  : hasRecord
                    ? 'text-label-b text-main3'
                    : 'text-label text-grey-700'
            return (
              <button
                key={id}
                type="button"
                disabled={future}
                onClick={() => onSelect(id)}
                className={`flex size-9 items-center justify-center rounded-pill ${tone} ${
                  id === selected && !isToday ? 'ring-2 ring-main3' : ''
                }`}
              >
                {date.getUTCDate()}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
