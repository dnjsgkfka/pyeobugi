<img width="1080" height="1350" alt="1" src="https://github.com/user-attachments/assets/af0fe419-19bd-41f9-9ebd-ed241e0ad5ec" />

# 펴부기

웹캠으로 거북목과 고개 숙임을 감지해 바른 자세를 돕는 데스크톱 앱 (Electron + React + TypeScript).
영상·얼굴·자세 수치는 기기 밖으로 나가지 않고, 서버로는 익명 이벤트 로그만 보냅니다.

## 시작하기

**Node 22 LTS** 를 쓰세요 (`.nvmrc` 에 적혀 있습니다). 패키지 매니저는 pnpm 이고 corepack 으로 받습니다.

```bash
nvm use                 # .nvmrc → Node 22
corepack enable
corepack pnpm install   # postinstall 이 Electron 설치를 확인하고 모델·wasm·폰트를 받습니다
pnpm dev
```

| 명령             | 하는 일                         |
| ---------------- | ------------------------------- |
| `pnpm dev`       | 개발 모드 실행 (mock 서버 켜짐) |
| `pnpm test`      | 단위 테스트                     |
| `pnpm typecheck` | 타입 검사 (main / renderer)     |
| `pnpm lint`      | ESLint                          |
| `pnpm hex`       | 토큰 밖 하드코딩 색 검사        |
| `pnpm assets`    | 모델·wasm·폰트만 다시 받기      |
| `pnpm build:win` | Windows 설치본 빌드             |

### Node 버전

**Node 25 이상에서는 설치하지 마세요.** Electron 설치 스크립트가 zip 에서 파일 하나만 풀고 종료 코드 0 으로 끝나,
`node_modules/electron/path.txt` 가 만들어지지 않습니다. 설치는 성공한 것처럼 보이지만 실행하면
`Error: Electron uninstall` 이 납니다 (#41, Node 26.7.0 에서 확인).

이 레포는 설치가 끝날 때 `scripts/check-electron.mjs` 가 Electron 실행 파일을 확인하고, 없으면 바로 멈추고 알려 줍니다.

이미 그런 상태라면 Node 22 로 바꾼 뒤 다시 설치하세요.

```bash
rm -rf node_modules
nvm use
corepack pnpm install --frozen-lockfile
ls node_modules/electron/path.txt   # 이 파일이 있어야 정상입니다
```

CI 도 Node 22 로 돌아갑니다 (`.github/workflows`).

### 자주 만나는 오류

| 오류                                                         | 원인과 해결                                                                                                       |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `Error: Electron uninstall`                                  | Node 25 이상으로 설치한 경우. 위 "Node 버전" 대로 다시 설치                                                       |
| `electron-vite: command not found`                           | 의존성을 아직 설치하지 않음 → `corepack pnpm install`                                                             |
| `Cannot read properties of undefined (reading 'isPackaged')` | `ELECTRON_RUN_AS_NODE=1` 이 설정된 환경(일부 에디터 터미널) → `unset ELECTRON_RUN_AS_NODE` 후 실행                |
| 카메라가 열리지 않음                                         | 가상 카메라(시선 추적·방송용)가 기본 장치인 경우가 많습니다. 실제 카메라를 기본으로 두거나 그 앱을 끄고 다시 시도 |

## 구조

| 경로                    | 내용                                                          |
| ----------------------- | ------------------------------------------------------------- |
| `src/main`              | Electron main — 창, 이벤트 큐, 설정, 리포트, 트레이, 뽀모도로 |
| `src/preload`           | `window.api` (IPC 계약은 `src/shared/ipc.ts`)                 |
| `src/renderer/app`      | 앱 창 (온보딩 · 리포트 · 설정)                                |
| `src/renderer/detector` | 숨은 창 — 카메라와 자세 추론만 담당                           |
| `src/renderer/overlay`  | 거북이 오버레이                                               |
| `src/shared`            | 양쪽이 함께 쓰는 타입·스키마·판정 로직                        |
| `src/shared/ai`         | AI 파트 레포에서 가져온 감지 코어 (여기서 고치지 않습니다)    |
| `docs`                  | 자세 임계값 등 결정 기록                                      |
