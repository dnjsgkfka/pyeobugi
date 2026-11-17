/* eslint-disable @typescript-eslint/explicit-function-return-type */
// 빌드된 app.asar 가 너무 크면 실패시킨다.
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const LIMIT_MB = 60
const ROOT = 'dist'

function findAsar(dir) {
  let found = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const info = statSync(p)
    if (info.isDirectory()) found = found.concat(findAsar(p))
    else if (name === 'app.asar') found.push({ path: p, bytes: info.size })
  }
  return found
}

let targets = []
try {
  targets = findAsar(ROOT)
} catch {
  console.log('[asar] dist 가 없어 건너뛴다')
  process.exit(0)
}
if (targets.length === 0) {
  console.log('[asar] app.asar 를 찾지 못해 건너뛴다')
  process.exit(0)
}

let bad = false
for (const { path, bytes } of targets) {
  const mb = bytes / 1024 / 1024
  const line = `${path}  ${mb.toFixed(1)}MB`
  if (mb > LIMIT_MB) {
    console.error(`[asar] 너무 큽니다 (한도 ${LIMIT_MB}MB): ${line}`)
    bad = true
  } else console.log(`[asar] ok  ${line}`)
}
if (bad) {
  console.error('\n설치본에 들어가면 안 되는 폴더가 섞였는지 electron-builder.yml 의 files 를 보세요.')
  process.exit(1)
}
