/* eslint-disable @typescript-eslint/explicit-function-return-type */
// 빌드 전에 실행 중인 앱을 끈다.
// 앱이 떠 있으면 dist/win-unpacked/resources/app.asar 가 잠겨 electron-builder 가
// EBUSY 로 죽는다. 이름이 바뀐 적이 있어 예전 이름도 함께 끈다.
import { execFileSync } from 'node:child_process'

const NAMES = ['pyeobugi.exe', 'turtle.exe']

if (process.platform !== 'win32') process.exit(0)

for (const name of NAMES) {
  try {
    // /t: 자식 프로세스(렌더러)까지, /f: 강제
    execFileSync('taskkill', ['/f', '/t', '/im', name], { stdio: 'pipe' })
    console.log(`[kill-app] ${name} 종료`)
  } catch {
    // 안 떠 있으면 taskkill 이 실패한다 (정상)
  }
}
