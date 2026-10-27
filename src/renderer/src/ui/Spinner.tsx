export function Spinner(): React.JSX.Element {
  return (
    <svg
      role="status"
      aria-label="로딩 중"
      width="56"
      height="56"
      viewBox="0 0 56 56"
      className="animate-spin"
      fill="none"
      strokeWidth="5"
    >
      <circle cx="28" cy="28" r="23" className="stroke-main2" />
      <path d="M28 5A23 23 0 0 1 51 28" className="stroke-main4" />
    </svg>
  )
}
