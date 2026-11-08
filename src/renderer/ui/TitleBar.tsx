/**
 * 커스텀 타이틀 바 (Figma Caption Button 108:1509 / Close 108:1535).
 * 버튼 46×32, 아이콘 10×10, 선 1px. 호버는 최소화·전체가 grey-200, 닫기가 danger.
 * 테두리 없는 창이라 최소화·전체·닫기를 직접 처리한다.
 */
type Props = { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }

function CaptionButton({ label, onClick, danger, children }: Props): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex h-8 w-[46px] items-center justify-center text-grey-700 ${
        danger ? 'hover:bg-danger hover:text-white' : 'hover:bg-grey-200'
      }`}
    >
      {children}
    </button>
  )
}

export function TitleBar(): React.JSX.Element {
  return (
    <div className="flex items-center" data-no-drag>
      <CaptionButton label="최소화" onClick={() => window.api.window.minimize()}>
        <svg width={10} height={10} viewBox="0 0 10 10" aria-hidden>
          <line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth={1} />
        </svg>
      </CaptionButton>

      <CaptionButton label="전체 화면" onClick={() => window.api.window.toggleMaximize()}>
        <svg width={10} height={10} viewBox="0 0 10 10" fill="none" aria-hidden>
          <rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" strokeWidth={1} />
        </svg>
      </CaptionButton>

      <CaptionButton label="닫기" danger onClick={() => window.api.window.close()}>
        <svg width={10} height={10} viewBox="0 0 10 10" aria-hidden>
          <line x1="0.5" y1="0.5" x2="9.5" y2="9.5" stroke="currentColor" strokeWidth={1} />
          <line x1="9.5" y1="0.5" x2="0.5" y2="9.5" stroke="currentColor" strokeWidth={1} />
        </svg>
      </CaptionButton>
    </div>
  )
}
