export type Step = 0 | 1 | 2

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
  const steps: Step[] = [0, 1, 2]
  return (
    <div className="flex w-full flex-col gap-3" role="radiogroup">
      <div className="relative h-2 w-full rounded-pill bg-grey-300">
        <div
          className="absolute -top-px left-0 h-2.25 rounded-pill bg-main3"
          style={{ width: POS[value] }}
        />
        {steps.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={value === s}
            aria-label={labels[s]}
            onClick={() => onChange(s)}
            className={`absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-pill border-2 border-main3 bg-white ${value === s ? '' : 'opacity-0'}`}
            style={{ left: POS[s] }}
          />
        ))}
      </div>
      <div className="flex justify-between">
        {labels.map((l, i) => (
          <button
            key={l}
            type="button"
            onClick={() => onChange(i as Step)}
            className={i <= value ? 'text-label-b text-grey-900' : 'text-label text-grey-700'}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  )
}
