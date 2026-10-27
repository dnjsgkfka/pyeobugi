export function Toggle({
  checked,
  onChange,
  label
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7.5 w-13 shrink-0 rounded-pill ${checked ? 'bg-main2' : 'bg-grey-300'}`}
    >
      <span
        className={`absolute top-0.75 size-6 rounded-pill bg-white shadow-card ${checked ? 'left-6.25' : 'left-0.75'}`}
      />
    </button>
  )
}
