import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'lg'
  /** 글자를 Body/16 SemiBold 로 (기본: sm=Label/14, lg=Body/16) */
  body?: boolean
  icon?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'sm',
  body,
  icon,
  className = '',
  children,
  ...rest
}: Props): React.JSX.Element {
  const tone = variant === 'primary' ? 'bg-main2 text-main5' : 'bg-grey-300 text-grey-900'
  const height = size === 'sm' ? 'h-11' : 'h-13'
  const pad = size === 'sm' && variant === 'primary' ? 'px-4 py-2.5' : 'p-2.5'
  const text = body || size === 'lg' ? 'text-body-b' : 'text-label-b'
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1 rounded-sm disabled:opacity-40 ${tone} ${height} ${pad} ${text} ${className}`}
      {...rest}
    >
      {children}
      {icon}
    </button>
  )
}
