import { IconCheck, LogoFull } from '@renderer/ui/icons'

const STEPS = ['카메라 연결', '얼굴 찾기', '기준 잡기']

/**
 * 온보딩 상단 헤더. current 는 1부터.
 * Figma Onboarding/Step: Upcoming(번호) / Current(배경 채움) / Done(번호 대신 체크 + SemiBold).
 */
export function OnboardingHeader({ current }: { current: 1 | 2 | 3 }): React.JSX.Element {
  return (
    <header className="absolute inset-x-0 top-0 flex items-start justify-between bg-linear-to-b from-main1/50 to-transparent px-6 pt-6 pb-12">
      <LogoFull className="h-[30px] w-29 shrink-0 self-start" />
      <div className="flex items-center gap-2">
        {STEPS.map((label, index) => {
          const step = index + 1
          const done = step < current
          const active = step === current
          return (
            <span
              key={label}
              className={`flex items-center gap-3 rounded-sm p-2 ${active ? 'bg-main5 text-main1' : 'text-main5'} ${done ? 'text-label-b' : 'text-label'}`}
            >
              <span
                className={`text-caption flex size-4 items-center justify-center rounded-pill border ${active ? 'border-main1' : 'border-main5'}`}
              >
                {done ? <IconCheck /> : step}
              </span>
              {label}
            </span>
          )
        })}
      </div>
    </header>
  )
}
