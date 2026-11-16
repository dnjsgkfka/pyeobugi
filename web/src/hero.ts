/**
 * 히어로 화면. 인트로가 끝나면 이 화면으로 이어진다.
 * 1차 — 다운로드 버튼은 둘 다 비활성이다 (설치본이 아직 Releases 에 없다).
 */

/** 서 있는 거북이. 머리가 위, 목이 아래로 뻗는다 */
function standingTurtle(id: string, neck: number): string {
  return `
    <svg class="turtle" id="${id}" viewBox="0 0 120 ${96 + neck}" aria-hidden="true">
      <rect class="neck" x="42" y="54" width="36" height="${neck + 40}" rx="18" />
      <ellipse class="flipper" cx="28" cy="74" rx="18" ry="11" />
      <ellipse class="flipper" cx="92" cy="74" rx="18" ry="11" />
      <ellipse class="head" cx="60" cy="48" rx="46" ry="42" />
      <ellipse class="eye" cx="46" cy="50" rx="6" ry="9" />
      <ellipse class="eye" cx="74" cy="50" rx="6" ry="9" />
    </svg>`
}

/** 위에서 내려온 거북이. 목이 위, 머리가 아래다 (얼굴은 바로 보인다) */
function hangingTurtle(id: string, neck: number): string {
  const headY = neck + 48
  return `
    <svg class="turtle" id="${id}" viewBox="0 0 120 ${neck + 100}" aria-hidden="true">
      <rect class="neck" x="42" y="0" width="36" height="${neck + 20}" rx="18" />
      <ellipse class="flipper" cx="26" cy="${headY + 26}" rx="20" ry="12" />
      <ellipse class="flipper" cx="94" cy="${headY + 26}" rx="20" ry="12" />
      <ellipse class="head" cx="60" cy="${headY}" rx="52" ry="46" />
      <ellipse class="eye" cx="44" cy="${headY + 4}" rx="7" ry="10" />
      <ellipse class="eye" cx="76" cy="${headY + 4}" rx="7" ry="10" />
    </svg>`
}

/** 바닥에 엎드린 거북이 */
function restingTurtle(): string {
  return `
    <svg class="resting" viewBox="0 0 170 86" aria-hidden="true">
      <rect class="neck" x="112" y="6" width="26" height="46" rx="13" />
      <path class="shell" d="M14 70c0-28 20-48 54-48s54 20 54 48z" />
      <ellipse class="flipper" cx="26" cy="70" rx="16" ry="9" />
      <ellipse class="flipper" cx="104" cy="70" rx="16" ry="9" />
      <ellipse class="head" cx="125" cy="18" rx="22" ry="18" />
      <ellipse class="eye" cx="131" cy="16" rx="3.5" ry="5" />
    </svg>`
}

export const HERO_HTML = `
<main class="hero">
  <div class="hero-sky" aria-hidden="true"></div>

  <!-- 노트북 목업 -->
  <div class="laptop">
    <!-- 위에서 목을 늘어뜨린 거북이 -->
    <div class="hanging">${hangingTurtle('hanging-turtle', 420)}</div>
    <div class="laptop-screen">
      <h1 class="headline">
        당신의 자세 건강,<br /><em>펴부기</em>가 지켜드릴게요.
      </h1>
      <p class="sub">
        공부하거나 일하는 동안 웹캠으로 앉은 자세를 살피고,<br />
        자세가 구부정해지기 시작하면 펴부기가 알려드려요.
      </p>
      <div class="actions">
        <button class="download" type="button" disabled>Windows용 다운로드</button>
        <button class="download ghost" type="button" disabled>macOS용 다운로드</button>
      </div>
      <p class="note">곧 다운로드할 수 있어요. 준비 중입니다.</p>
    </div>
    <div class="laptop-base" aria-hidden="true"></div>
  </div>

  <!-- 오른쪽에서 올라오는 거북이와 말풍선 -->
  <div class="peeking">
    <p class="bubble">빨리 다운로드 하세요</p>
    ${standingTurtle('peeking-turtle', 300)}
  </div>

  <!-- 왼쪽 아래에 엎드린 거북이 -->
  <div class="lying">${restingTurtle()}</div>
</main>`
