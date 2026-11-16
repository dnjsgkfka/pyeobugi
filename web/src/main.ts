import './styles.css'
// 데스크톱 앱 온보딩의 첫 화면을 그대로 재생한다. 끝나는 자리가 곧 랜딩 히어로다.
import { runIntroAnimation } from '@app/app/screens/onboarding/intro-animation'
import { INTRO_STAGE_HTML } from '@app/app/screens/onboarding/intro-stage'
import { applyLanding, showPet } from './landing'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('#app 이 없다')

app.innerHTML = `<div id="frame"><div id="stage" aria-live="polite">${INTRO_STAGE_HTML}</div></div>`
applyLanding(app)

runIntroAnimation(app, () => {})
// 인트로가 끝나면(#startBtn 이 포커스를 받을 수 있게 되는 순간) 거북이를 올린다
const ready = setInterval(() => {
  const btn = app.querySelector<HTMLButtonElement>('#startBtn')
  if (!btn || btn.tabIndex !== 0) return
  clearInterval(ready)
  showPet(app)
}, 120)
