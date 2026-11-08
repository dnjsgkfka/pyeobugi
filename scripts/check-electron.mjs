/* eslint-disable @typescript-eslint/explicit-function-return-type */
// Electron 설치가 끝났는지 확인한다.
// Electron 의 install.js 는 zip 해제가 중간에 멈춰도 종료 코드 0 으로 끝나서,
// 설치 로그만 보면 성공처럼 보인다 (Node 26 에서 확인된 문제, #41).
// 그 상태로 앱을 실행하면 "Error: Electron uninstall" 이 나므로 설치 직후에 잡는다.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = 'node_modules/electron'
const POINTER = join(ROOT, 'path.txt')

if (!existsSync(ROOT)) {
  // Electron 자체가 없는 환경(의존성 일부만 설치)에서는 검사할 것이 없다
  process.exit(0)
}

function fail(reason) {
  const [major] = process.versions.node.split('.')
  console.error(`\n✗ Electron 설치가 끝나지 않았습니다 (${reason}).`)
  console.error(`  지금 Node 버전: ${process.versions.node}`)
  if (Number(major) >= 25) {
    console.error('  Node 25 이상에서 알려진 문제입니다 (#41). Node 22 로 다시 설치해 주세요:')
  } else {
    console.error('  설치를 다시 해 주세요:')
  }
  console.error('    rm -rf node_modules')
  console.error('    nvm use            # .nvmrc → Node 22')
  console.error('    corepack pnpm install --frozen-lockfile\n')
  process.exit(1)
}

if (!existsSync(POINTER)) fail(`${POINTER} 없음`)

// path.txt 는 dist/ 안의 실행 파일 이름이다 (electron/index.js 와 같은 방식으로 찾는다)
const binary = join(ROOT, 'dist', readFileSync(POINTER, 'utf8').trim())
if (!existsSync(binary)) fail(`실행 파일 없음: ${binary}`)

console.log('electron ok')
