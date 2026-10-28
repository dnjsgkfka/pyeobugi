import { formatDuration } from '@shared/format'

export interface DonutSlice {
  label: string
  seconds: number
  /** 도넛 색 (토큰 클래스) */
  tone: string
  /** SVG 획에 쓸 CSS 변수 이름 */
  stroke: string
}

// Figma 내보내기 기준: 바깥 반지름 100, 안쪽 80 → 중심선 90, 굵기 20, 끝은 둥글다.
// 12시에서 시작해 시계 방향으로 돌고, 그리는 순서는 범례의 반대다
// (가장 큰 '바른 자세' 조각이 12시에서 끝난다).
const SIZE = 200
const STROKE = 20
const RADIUS = 90
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
/** 조각 사이로 보이는 빈 틈 */
const GAP = 3
/** 둥근 끝은 선 양쪽으로 굵기의 절반만큼 더 튀어나온다 */
const CAP = STROKE / 2

/** 자세 분포 도넛 (200×200) + 범례 */
export function PostureDonut({
  slices,
  totalSeconds
}: {
  slices: DonutSlice[]
  totalSeconds: number
}): React.JSX.Element {
  // 조각마다 시작 위치가 필요하다. 그리기 전에 미리 계산해 둔다.
  const visible = [...slices].reverse().filter((slice) => slice.seconds > 0)
  const arcs: { slice: DonutSlice; length: number; offset: number }[] = []
  for (let i = 0, cursor = 0; i < visible.length; i++) {
    const slice = visible[i]
    const full = totalSeconds > 0 ? (slice.seconds / totalSeconds) * CIRCUMFERENCE : 0
    // 조각이 하나뿐이면 틈 없이 꽉 채운다
    const visibleArc = visible.length > 1 ? full - GAP : full
    arcs.push({
      slice,
      // 둥근 끝이 더해지는 만큼 미리 빼 둬야 옆 조각과 겹치지 않는다
      length: Math.max(0, visibleArc - CAP * 2),
      offset: cursor + (full - visibleArc) / 2 + CAP
    })
    cursor += full
  }

  // Figma: 폭 276 고정. 남는 폭은 옆의 시간대별 차트가 가져간다
  return (
    <section className="flex w-[276px] shrink-0 flex-col justify-between rounded-lg bg-white p-4 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="text-body-b text-grey-900">자세 분포</h2>
        <span className="text-label text-grey-500">총 {formatDuration(totalSeconds)} 기준</span>
      </div>

      <div className="flex items-center justify-center gap-2.5">
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label="자세 분포"
        >
          {/* 12시에서 시작하도록 돌린다 */}
          <g
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
          >
            {arcs.map(({ slice, length, offset }) => (
              <circle
                key={slice.label}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                stroke={`var(${slice.stroke})`}
                strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                strokeDashoffset={-offset}
              />
            ))}
          </g>
        </svg>
      </div>

      <div className="flex flex-col gap-3">
        {slices.map((slice) => {
          const percent = totalSeconds > 0 ? Math.round((slice.seconds / totalSeconds) * 100) : 0
          return (
            <div key={slice.label} className="flex items-center justify-between">
              <span className="flex w-[70px] items-center gap-1.5">
                <span className={`size-2.5 rounded-xs ${slice.tone}`} />
                <span className="text-label text-grey-900">{slice.label}</span>
              </span>
              <span className="text-label w-20 text-grey-500">{formatDuration(slice.seconds)}</span>
              <span className="text-body w-[50px] text-right text-grey-900">{percent}%</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
