import { useCallback, useRef } from 'react'

export type Step = 0 | 1 | 2

const STEPS: Step[] = [0, 1, 2]
const POS = ['0%', '50%', '100%']

export function Slider3({
  value,
  onChange,
  labels = ['느슨하게', '보통', '엄격하게']
}: {
  value: Step
  onChange: (v: Step) => void
  labels?: [string, string, string]
}): React.JSX.Element {
  const track = useRef<HTMLDivElement>(null)

  /** 누른 위치에서 가장 가까운 단계로 */
  const pick = useCallback(
    (clientX: number) => {
      const rect = track.current?.getBoundingClientRect()
      if (!rect || rect.width === 0) return
      const ratio = (clientX - rect.left) / rect.width
      const next = Math.min(2, Math.max(0, Math.round(ratio * 2))) as Step
      if (next !== value) onChange(next)
    },
    [onChange, value]
  )

  /** 손잡이를 끌면 따라온다. 손을 떼기 전까지 포인터를 붙잡아 둔다. */
  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId)
      pick(event.clientX)
    },
    [pick]
  )

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.buttons === 0) return
      pick(event.clientX)
    },
    [pick]
  )

  function onKeyDown(event: React.KeyboardEvent): void {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (delta === 0) return
    event.preventDefault()
    const next = Math.min(2, Math.max(0, value + delta)) as Step
    if (next !== value) onChange(next)
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <div
        ref={track}
        role="slider"
        tabIndex={0}
        aria-valuemin={0}
        aria-valuemax={2}
        aria-valuenow={value}
        aria-valuetext={labels[value]}
        aria-label="교정 강도"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={onKeyDown}
        className="relative h-2 w-full cursor-pointer touch-none rounded-pill bg-grey-300"
      >
        <div
          className="absolute -top-0.125 left-0 h-2.25 rounded-pill bg-main3 transition-[width] duration-150"
          style={{ width: POS[value] }}
        />
        <span
          aria-hidden
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-pill border-2 border-main3 bg-white transition-[left] duration-150"
          style={{ left: POS[value] }}
        />
      </div>

      <div className="flex justify-between">
        {STEPS.map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => onChange(step)}
            className={step <= value ? 'text-label-b text-grey-900' : 'text-label text-grey-700'}
          >
            {labels[step]}
          </button>
        ))}
      </div>
    </div>
  )
}
