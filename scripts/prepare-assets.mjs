// 런타임 에셋(MediaPipe 모델·wasm, Pretendard 폰트)을 public/ 으로 모은다.
// CDN 을 쓰지 않아 오프라인에서도 동작한다. 용량이 커서 git 에는 넣지 않는다
// → 클론한 뒤 `pnpm install`(postinstall) 또는 `pnpm assets` 를 한 번 실행.
import { createWriteStream, cpSync, existsSync, mkdirSync } from 'node:fs'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
const OUT_DIR = 'src/renderer/public/mediapipe'
const MODEL_FILE = `${OUT_DIR}/face_landmarker.task`
const WASM_SRC = 'node_modules/@mediapipe/tasks-vision/wasm'

mkdirSync(OUT_DIR, { recursive: true })

const FONT_SRC = 'node_modules/pretendard/dist/web/static/woff2'
const FONTS = ['Pretendard-Regular.woff2', 'Pretendard-Medium.woff2', 'Pretendard-SemiBold.woff2']

if (existsSync(FONT_SRC)) {
  mkdirSync(`${OUT_DIR}/../fonts`, { recursive: true })
  for (const font of FONTS) cpSync(`${FONT_SRC}/${font}`, `src/renderer/public/fonts/${font}`)
  console.log('copied fonts')
} else {
  console.error(`missing ${FONT_SRC} — run pnpm install first`)
  process.exit(1)
}

if (existsSync(WASM_SRC)) {
  cpSync(WASM_SRC, `${OUT_DIR}/wasm`, { recursive: true })
  console.log('copied wasm')
} else {
  console.error(`missing ${WASM_SRC} — run pnpm install first`)
  process.exit(1)
}

if (existsSync(MODEL_FILE)) {
  console.log('model already downloaded')
} else {
  console.log('downloading face_landmarker.task …')
  try {
    const res = await fetch(MODEL_URL)
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
    await pipeline(Readable.fromWeb(res.body), createWriteStream(MODEL_FILE))
    console.log(`saved ${MODEL_FILE}`)
  } catch (error) {
    // 모델은 실행할 때만 필요하다. CI(빌드/테스트)는 없어도 돌아가므로 설치를 실패시키지 않는다.
    console.warn(`could not download the model (${error.message}). run \`pnpm assets\` later.`)
  }
}
