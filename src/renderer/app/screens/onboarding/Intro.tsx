import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import './intro.css'
import { runIntroAnimation } from './intro-animation'
import { INTRO_STAGE_HTML } from './intro-stage'

/** 첫 화면. 디자이너가 만든 애니메이션을 그대로 돌리고, 시작하기를 누르면 권한 안내로 간다. */
export default function Intro(): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const root = ref.current
    if (!root) return
    // 원본의 무대 구조(#frame > #stage)를 그대로 다시 만들어 준다
    root.innerHTML = `<div id="frame"><div id="stage" aria-live="polite">${INTRO_STAGE_HTML}</div></div>`
    return runIntroAnimation(root, () => navigate('/onboarding/permission'))
  }, [navigate])

  return <div ref={ref} className="flex h-full w-full items-center justify-center bg-main1" />
}
