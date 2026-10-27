import type { PostureState } from './state'
import { STATE_STYLE } from './state'

export function StateBadge({ state }: { state: PostureState }): React.JSX.Element {
  const s = STATE_STYLE[state]
  return (
    <span
      className={`text-label-b inline-flex items-center gap-2 rounded-pill px-3 py-1 ${s.surface}`}
    >
      <span className="size-2 rounded-pill bg-current" />
      {s.label}
    </span>
  )
}
