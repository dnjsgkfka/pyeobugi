# 펴부기 랜딩 페이지

Vercel 에 배포한다. 데스크톱 앱과 같은 레포에 두는 이유는 **온보딩 인트로 애니메이션과
디자인 토큰을 복사하지 않고 그대로 쓰기** 위해서다.

| 가져다 쓰는 것 | 경로 |
| --- | --- |
| 인트로 애니메이션 | `../src/renderer/app/screens/onboarding/intro-animation.ts` |
| 인트로 무대(SVG) | `../src/renderer/app/screens/onboarding/intro-stage.ts` |
| 인트로 스타일 | `../src/renderer/app/screens/onboarding/intro.css` |
| 디자인 토큰 | `../src/renderer/styles/tokens.css` |

앱 쪽에서 애니메이션을 고치면 랜딩도 같이 바뀐다.

## 개발

```bash
cd web
pnpm install
pnpm dev
```

워크스페이스가 아니라 **독립 프로젝트**다. 루트의 `postinstall`(Electron 내려받기,
에셋 준비)을 Vercel 에서 돌리지 않기 위해서다.

## Vercel 설정

| 항목 | 값 |
| --- | --- |
| Root Directory | `web` |
| Framework Preset | Vite |
| Build Command | 기본값 (`pnpm build`) |
| Output Directory | `dist` |

## 1차 범위

- 다운로드 버튼은 **둘 다 비활성**이다. 설치본이 Releases 에 올라가면 Windows 버튼을
  `/releases/latest/download/…` 로 연결하고 SmartScreen 안내를 붙인다.
- 폰트는 Pretendard CDN 을 쓴다. 앱은 폰트를 내려받아 번들에 넣지만(`pnpm assets`),
  랜딩까지 그 파이프라인을 태우면 Vercel 빌드가 무거워진다.
