/**
 * 온보딩 하단 안내 패널.
 * Figma: padding 48/24, 아래로 갈수록 어두워지는 그라데이션,
 * 문구 묶음 gap 12 / 문구와 버튼 사이 30.
 */
export function OnboardingPanel({
  title,
  body,
  children
}: {
  title: string
  /** \n 으로 줄바꿈 */
  body: string
  /** 버튼이나 진행 바 */
  children?: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="absolute inset-x-0 bottom-0 flex flex-col items-center bg-linear-to-b from-transparent to-main1/50 px-6 py-12">
      <div className="flex w-full flex-col items-center gap-[30px]">
        <div className="flex w-full flex-col gap-3 text-center">
          <h2 className="text-heading text-white">{title}</h2>
          <p className="text-body whitespace-pre-line text-grey-200">{body}</p>
        </div>
        {children}
      </div>
    </div>
  )
}
