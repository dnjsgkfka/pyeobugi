/* eslint-disable @typescript-eslint/explicit-function-return-type */
// tokens.css 밖에서 색을 직접 쓰면 실패한다. (hex / rgb / hsl)
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, sep } from 'node:path'

const ROOT = 'src/renderer'
// 예외: 토큰 파일과, 디자이너가 준 그림을 그대로 담은 파일
const ALLOW = ['tokens.css', 'onboarding/intro-stage.ts', 'onboarding/intro.css']
const RE = /(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|\b(?:rgba?|hsla?)\(/

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) yield* walk(p)
    else if (/\.(css|ts|tsx)$/.test(name)) yield p
  }
}

let bad = 0
for (const file of walk(ROOT)) {
  const normalized = file.split(sep).join('/')
  if (ALLOW.some((a) => normalized.endsWith(a))) continue
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      if (RE.test(line)) {
        console.error(`${file}:${i + 1}  ${line.trim()}`)
        bad++
      }
    })
}
if (bad) {
  console.error(`\n색 직접 사용 ${bad}건. tokens.css 에 토큰으로 추가하세요.`)
  process.exit(1)
}
console.log('hex check ok')
