// 런타임 에셋(MediaPipe 모델·wasm, Pretendard 폰트)을 public/ 으로 모은다.
// CDN 을 쓰지 않아 오프라인에서도 동작한다. 용량이 커서 git 에는 넣지 않는다
// → 클론한 뒤 `pnpm install`(postinstall) 또는 `pnpm assets` 를 한 번 실행.
import { createWriteStream, cpSync, existsSync, mkdirSync } from 'node:fs'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

// face_landmarker: 기존(비교용) 구현. blaze_face_short_range: AI 파트와 같은 경량 검출기
const MODELS = [
  {
    file: 'face_landmarker.task',
    url: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
  },
  {
    file: 'blaze_face_short_range.tflite',
    url: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite'
  }
]
const OUT_DIR = 'src/renderer/public/mediapipe'
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

// FilesetResolver 는 SIMD 지원 여부에 따라 vision_wasm_internal / nosimd 둘 중 하나만 쓴다.
// module 변형(13MB)은 쓰지 않으므로 복사하지 않는다 (설치본 크기)
const WASM_KEEP = /^vision_wasm_(internal|nosimd_internal)\.(js|wasm)$/

if (existsSync(WASM_SRC)) {
  cpSync(WASM_SRC, `${OUT_DIR}/wasm`, {
    recursive: true,
    filter: (src) => {
      const name = src.split(/[\\/]/).pop()
      return src === WASM_SRC || !name.includes('.') || WASM_KEEP.test(name)
    }
  })
  console.log('copied wasm')
} else {
  console.error(`missing ${WASM_SRC} — run pnpm install first`)
  process.exit(1)
}

for (const { file, url } of MODELS) {
  const target = `${OUT_DIR}/${file}`
  if (existsSync(target)) {
    console.log(`${file} already downloaded`)
    continue
  }
  console.log(`downloading ${file} …`)
  try {
    const res = await fetch(url)
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
    await pipeline(Readable.fromWeb(res.body), createWriteStream(target))
    console.log(`saved ${target}`)
  } catch (error) {
    // 모델은 실행할 때만 필요하다. CI(빌드/테스트)는 없어도 돌아가므로 설치를 실패시키지 않는다.
    console.warn(`could not download ${file} (${error.message}). run \`pnpm assets\` later.`)
  }
}
