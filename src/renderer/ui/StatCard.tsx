export interface StatPart {
  value: string
  unit: string
}

/** Chart/Stat Card — Percentage: parts=[{78,%}], Duration: parts=[{5,시간},{40,분}] */
export function StatCard({
  title,
  parts,
  note
}: {
  title: string
  parts: StatPart[]
  note: string
}): React.JSX.Element {
  return (
    <div className="flex h-35 flex-1 flex-col justify-between rounded-lg bg-white px-4 py-5 shadow-card">
      <span className="text-body-b h-4 text-grey-900">{title}</span>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          {parts.map((p) => (
            <div key={p.unit} className="flex items-end gap-1">
              <span className="flex h-8.5 flex-col justify-center">
                <span className="text-display text-black">{p.value}</span>
              </span>
              <span className="text-body text-grey-700">{p.unit}</span>
            </div>
          ))}
        </div>
        <span className="text-label h-4 text-grey-500">{note}</span>
      </div>
    </div>
  )
}
