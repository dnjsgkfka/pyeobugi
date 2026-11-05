/**
 * AI 파트 레포(kayo2e/pyeobugi-AI)의 `src/renderer/src/detection/face-detector.ts` 를
 * 가져온 파일 (main, 2026-11-05 기준). 모델·wasm 경로만 우리 public 구조에 맞췄다.
 */
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision'
import type { Detection } from '@mediapipe/tasks-vision'
import { toFaceSample } from '@shared/ai/face-geometry'
import type { Point } from '@shared/ai/face-geometry'
import type { FaceSample } from '@shared/ai/engine'

type Keypoint = Detection['keypoints'][number]

export interface FaceDetection {
  sample: FaceSample | null
  box: { x: number; y: number; width: number; height: number }
  keypoints: Point[]
}

/**
 * 모델과 wasm 은 앱 안에 둔다 (오프라인에서도 동작).
 * 이 페이지는 `/detector/index.html` 이고 파일은 그 위 폴더에 있으므로 `../` 로 찾는다.
 */
const asset = (path: string): string => new URL(`../mediapipe/${path}`, document.baseURI).href

export async function createFaceDetector(): Promise<FaceDetector> {
  const fileset = await FilesetResolver.forVisionTasks(asset('wasm'))
  return FaceDetector.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: asset('blaze_face_short_range.tflite'), delegate: 'CPU' },
    runningMode: 'VIDEO',
    minDetectionConfidence: 0.5
  })
}

let frame: CanvasRenderingContext2D | null = null

// CPU delegate 는 <video> 를 그대로 주면 아무것도 못 찾는다 → 캔버스로 한 번 옮긴다
function captureFrame(video: HTMLVideoElement, width: number, height: number): HTMLCanvasElement {
  if (!frame || frame.canvas.width !== width || frame.canvas.height !== height) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    frame = canvas.getContext('2d', { willReadFrequently: true })!
  }
  frame.drawImage(video, 0, 0, width, height)
  return frame.canvas
}

const toPixels = (k: Keypoint | undefined, width: number, height: number): Point | null =>
  k ? { x: k.x * width, y: k.y * height } : null

const largestFace = (detections: Detection[]): Detection | undefined =>
  detections.reduce<Detection | undefined>(
    (best, d) => ((d.boundingBox?.height ?? 0) > (best?.boundingBox?.height ?? 0) ? d : best),
    undefined
  )

function toSample(face: Detection, width: number, height: number): FaceSample | null {
  const [rightEye, leftEye, noseTip, , rightEar, leftEar] = face.keypoints.map((k) =>
    toPixels(k, width, height)
  )
  if (!rightEye || !leftEye || !noseTip || !rightEar || !leftEar || !face.boundingBox) return null
  return toFaceSample(
    { rightEye, leftEye, noseTip, rightEar, leftEar },
    face.boundingBox.height / height
  )
}

export function detectFace(detector: FaceDetector, video: HTMLVideoElement): FaceDetection | null {
  const { videoWidth: width, videoHeight: height } = video
  if (width === 0 || height === 0) return null

  const found = largestFace(
    detector.detectForVideo(captureFrame(video, width, height), performance.now()).detections
  )
  if (!found?.boundingBox) return null

  const { originX, originY, width: w, height: h } = found.boundingBox
  return {
    sample: toSample(found, width, height),
    box: { x: originX / width, y: originY / height, width: w / width, height: h / height },
    keypoints: found.keypoints.map((k) => ({ x: k.x, y: k.y }))
  }
}
