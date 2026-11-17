/**
 * 랜딩 히어로
 */
import neckUrl from './assets/turtle-neck.png'

/**
 * 최신 릴리스의 윈도우 설치본.
 * 파일 이름에 버전이 없어서(electron-builder.yml 의 nsis.artifactName)
 * 새 버전을 올려도 이 주소는 그대로다.
 */
const WINDOWS_DOWNLOAD =
  'https://github.com/dnjsgkfka/pyeobugi/releases/latest/download/pyeobugi-setup.exe'

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
    <a class="btn btn-primary" href="${WINDOWS_DOWNLOAD}">Windows용 다운로드</a>
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
