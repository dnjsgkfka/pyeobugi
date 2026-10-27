import { LogoFull } from '@renderer/ui/icons'

const STEPS = ['카메라 연결', '얼굴 찾기', '기준 잡기']

/** 온보딩 상단 헤더. current 는 1부터. */
export function OnboardingHeader({ current }: { current: 1 | 2 | 3 }): React.JSX.Element {
  return (
    <header className="absolute inset-x-0 top-0 flex items-start justify-between bg-linear-to-b from-main1/50 to-transparent px-6 pt-6 pb-12">
      <LogoFull className="h-[30px] w-auto" />
      <div className="flex items-center gap-2">
        {STEPS.map((label, index) => {
          const step = index + 1
          const active = step === current
          return (
            <span
              key={label}
              className={`text-label flex items-center gap-2 rounded-sm p-2 ${active ? 'bg-main5 text-main1' : 'text-main5'}`}
            >
              <span
                className={`text-caption flex size-4 items-center justify-center rounded-pill border ${active ? 'border-main1' : 'border-main5'}`}
              >
                {step}
              </span>
              {label}
            </span>
          )
        })}
      </div>
    </header>
  )
}
