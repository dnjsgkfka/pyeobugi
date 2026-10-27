// MediaPipe 모델과 wasm 을 앱 안에 복사한다 (오프라인에서도 동작하도록 CDN 을 쓰지 않는다).
// 모델은 용량이 커서 git 에 넣지 않는다 → 클론 후 `pnpm mediapipe` 를 한 번 실행.
import { createWriteStream, cpSync, existsSync, mkdirSync } from 'node:fs'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
const OUT_DIR = 'src/renderer/public/mediapipe'
const MODEL_FILE = `${OUT_DIR}/face_landmarker.task`
const WASM_SRC = 'node_modules/@mediapipe/tasks-vision/wasm'

mkdirSync(OUT_DIR, { recursive: true })

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
    console.warn(`could not download the model (${error.message}). run \`pnpm mediapipe\` later.`)
  }
}
