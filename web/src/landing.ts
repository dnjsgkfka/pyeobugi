/**
 * 랜딩 히어로 = 온보딩 인트로의 마지막 상태(Figma "시작 화면" 152:2666).
 *
 * 배경·노트북·노치·화면·노트북 위 거북이는 `INTRO_STAGE_HTML` 그대로다.
 * 화면 안의 '목이 늘어난 거북이' 는 Figma 가 쓰는 이미지(image 110693 / 110694)를
 * 같은 크롭·같은 자리로 그대로 쓴다. 두 조각은 한 장(`assets/turtle-neck.png`)을
 * 잘라 쓰는 것이라, 크롭값은 Figma 의 cropTransform 에서 그대로 환산했다.
 */
import neckUrl from './assets/turtle-neck.png'

/** 노트북 화면 안 내용 (Figma 152:2708) */
const SCREEN_CONTENT = `
  <div class="intro">
    <h1 class="display">당신의 자세 건강,<br /><span class="accent">펴부기</span>가 지켜드릴게요.</h1>
    <p class="body16">
      공부하거나 일하는 동안 웹캠으로 앉은 자세를 살피고,<br />
      자세가 구부정해지기 시작하면 펴부기가 알려드려요.
    </p>
  </div>
  <div class="downloads">
    <button class="btn btn-primary" type="button" disabled>Windows용 다운로드</button>
    <button class="btn btn-muted" type="button" disabled>macOS용 다운로드</button>
  </div>
  <!-- 인트로 애니메이션이 #startBtn 을 참조한다. 랜딩에서는 쓰지 않으므로 숨겨 둔다 -->
  <div hidden><button id="startBtn" tabindex="-1"></button></div>`

/** 인트로 무대를 랜딩용으로 바꾼다. `runIntroAnimation` 을 부르기 전에 실행한다. */
export function applyLanding(root: HTMLElement): void {
  const content = root.querySelector('#startContent')
  if (content) content.innerHTML = SCREEN_CONTENT

  const stage = root.querySelector('#stage')
  if (!stage) return
  stage.insertAdjacentHTML(
    'beforeend',
    `<div id="petScreen" aria-hidden="true">
       <div class="neck-img neck-body" style="background-image:url(${neckUrl})"></div>
       <div class="neck-img neck-head" style="background-image:url(${neckUrl})"></div>
     </div>
     <p id="petBubble" role="status">빨리 다운로드 하세요</p>`
  )
}

/** 인트로가 끝난 뒤: 거북이와 말풍선이 떠오른다 */
export function showPet(root: HTMLElement): void {
  root.querySelector('#petScreen')?.classList.add('on')
  root.querySelector('#petBubble')?.classList.add('on')
}
