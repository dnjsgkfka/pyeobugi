import type { ReactNode } from 'react'

export function SpeechBubble({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <div className="flex w-38.25 flex-col items-center">
      <div className="text-label w-full rounded-md bg-main5 p-3 text-center text-main1 shadow-card">
        {children}
      </div>
      <span className="-mt-1 h-4 w-3 bg-main5 [clip-path:polygon(0_0,100%_0,50%_100%)]" />
    </div>
  )
}
