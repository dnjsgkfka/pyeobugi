import { useEffect, useRef, useState } from 'react'
import { kstDateString } from '@shared/time'
import { IconChevron } from '@renderer/ui/icons'
import { Calendar } from './Calendar'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** "2026-10-09" → "2026.10.09" */
function dotted(date: string): string {
  return date.replaceAll('-', '.')
}

/** 오늘·어제는 그렇게 부르고, 그 밖에는 요일로 */
function labelFor(date: string): string {
  const today = kstDateString(new Date())
  if (date === today) return '오늘'
  const yesterday = kstDateString(new Date(Date.now() - 24 * 60 * 60 * 1000))
  if (date === yesterday) return '어제'
  return `${WEEKDAYS[new Date(`${date}T00:00:00+09:00`).getDay()]}요일`
}

/** Date/Date Picker — white, radius 8, padding 12px 8px 12px 12px, gap 4. 누르면 캘린더가 열린다. */
export function DatePicker({
  value,
  recorded,
  onChange
}: {
  /** `YYYY-MM-DD` */
  value: string
  recorded: Set<string>
  onChange: (date: string) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  // value 는 `YYYY-MM-DD` 이므로 앞 7자리만 떼어 그 달 1일로 만든다
  const [month, setMonth] = useState(() => new Date(`${value.slice(0, 7)}-01T00:00:00Z`))
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent): void {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1 rounded-md bg-white py-3 pr-2 pl-3"
      >
        <span className="flex items-center gap-1">
          <span className="text-label-b text-grey-900">{labelFor(value)}</span>
          <span className="text-label text-grey-900">({dotted(value)})</span>
        </span>
        <IconChevron className={`text-grey-900 ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full right-0 z-20 mt-2">
          <Calendar
            selected={value}
            recorded={recorded}
            month={month}
            onMonthChange={setMonth}
            onSelect={(date) => {
              onChange(date)
              setOpen(false)
            }}
          />
        </div>
      )}
    </div>
  )
}
