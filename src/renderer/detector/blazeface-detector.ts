/**
 * AI 파트 모듈(kayo2e/pyeobugi-AI 의 `useDetection`)의 루프를 우리 detector 창 구조에 맞게 옮긴 구현.
 * 훅 대신 평범한 함수로 두었고, 카메라만 우리 장치 선택 로직을 쓴다 (AI 쪽은 기본 장치만 연다).
 *
 * - 추론 주기는 적응형: 평소 1초 / 자세가 바뀌는 중 0.25초 / 자리비움 1분 뒤 3초
 * - 기준값은 설정(main)에서 받아 넣는다. AI 레포의 zustand store 는 쓰지 않는다
 * - 영상·키포인트는 이 창 밖으로 나가지 않는다
 */
import type { FaceDetector } from '@mediapipe/tasks-vision'
import { initialDistanceState, stepDistance } from '@shared/ai/distance'
import {
  initialEngineState,
  nextIntervalMs,
  resetPosture,
  stepEngine,
  type EngineState,
  type Transition
} from '@shared/ai/engine'
import { initialFeedback, updateFeedback, type PostureFeedback } from '@shared/ai/feedback'
import type { Baseline } from '@shared/ai/score'
import type {
  CalibrationPhase,
  DetectionUpdate,
  DetectorStatus,
  PostureDetector
} from '@shared/detector'
import { classifyCameraError } from './camera-error'
import { closeCamera, openCamera } from './camera'
import { createFaceDetector, detectFace } from './face-detector'

/** 온보딩 프리뷰 간격과 폭 (추론과 별개로 돌린다) */
const PREVIEW_MS = 100
const PREVIEW_WIDTH = 320

type Listener<T> = (value: T) => void

export function createBlazeFaceDetector(): PostureDetector {
  const updateListeners = new Set<Listener<DetectionUpdate>>()
  const statusListeners = new Set<Listener<DetectorStatus>>()
  const calibrationListeners = new Set<Listener<CalibrationPhase>>()
  const previewListeners = new Set<Listener<string>>()

  let detector: FaceDetector | null = null
  let stream: MediaStream | null = null
  let video: HTMLVideoElement | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  let previewTimer: ReturnType<typeof setInterval> | undefined
  let previewCanvas: HTMLCanvasElement | null = null
  let running = false

  let baseline: Baseline | null = null
  let engine: EngineState = initialEngineState
  let feedback: PostureFeedback = initialFeedback
  let distance = initialDistanceState

  function setStatus(next: DetectorStatus): void {
    statusListeners.forEach((listener) => listener(next))
  }

  function emitCalibration(phase: CalibrationPhase): void {
    calibrationListeners.forEach((listener) => listener(phase))
  }

  /**
   * 지금 자세를 기준으로 저장한다.
   * 한 프레임이 아니라 엔진이 EMA 로 평활해 둔 pitch·size 를 쓴다 (Figma: 누르는 순간의 위치).
   */
  function captureBaseline(): void {
    if (!running) return
    if (!engine.present || engine.pitch === null || engine.size === null) {
      emitCalibration({
        phase: 'failed',
        message: '얼굴이 보이지 않아요. 화면을 보고 다시 눌러 주세요.'
      })
      return
    }
    const next: Baseline = { pitch: engine.pitch, size: engine.size }
    // 기준이 바뀌었으니 진행 중이던 판정은 끝낸다 (RECALIBRATED)
    const reset = resetPosture(engine, Date.now())
    engine = reset.state
    distance = initialDistanceState
    pendingTransitions.push(...reset.transitions)
    emitCalibration({ phase: 'complete', baseline: next })
  }

  /** 다음 추론 때 함께 내보낼 전이 (기준 재설정처럼 루프 밖에서 생긴 것) */
  const pendingTransitions: Transition[] = []

  /** 프리뷰: 추론과 별개로 돌린다. 축소한 JPEG 만 내보내고 원본 프레임은 이 창에 남는다 */
  function sendPreview(): void {
    if (!video || video.videoWidth === 0) return
    const scale = PREVIEW_WIDTH / video.videoWidth
    const width = PREVIEW_WIDTH
    const height = Math.round(video.videoHeight * scale)
    if (!previewCanvas || previewCanvas.width !== width || previewCanvas.height !== height) {
      previewCanvas = document.createElement('canvas')
      previewCanvas.width = width
      previewCanvas.height = height
    }
    const context = previewCanvas.getContext('2d')
    if (!context) return
    context.drawImage(video, 0, 0, width, height)
    const frame = previewCanvas.toDataURL('image/jpeg', 0.5)
    previewListeners.forEach((listener) => listener(frame))
  }

  function loop(): void {
    if (!running || !detector || !video) return
    const now = Date.now()
    const found = detectFace(detector, video)
    const face = found?.sample ?? null

    const transitions: Transition[] = pendingTransitions.splice(0)
    const stepped = stepEngine(engine, { at: now, face }, baseline)
    engine = stepped.state
    transitions.push(...stepped.transitions)

    feedback = updateFeedback(feedback, engine, now, baseline !== null, transitions)
    distance = stepDistance(distance, now, face?.size ?? null, baseline)

    const intervalMs = nextIntervalMs(engine, now)
    const update: DetectionUpdate = {
      sample: {
        t: now,
        face: face !== null,
        pitch: face?.pitch ?? null,
        size: face?.size ?? null
      },
      feedback,
      distance,
      transitions,
      intervalMs
    }
    updateListeners.forEach((listener) => listener(update))
    timer = setTimeout(loop, intervalMs)
  }

  async function start(): Promise<void> {
    if (running) return
    setStatus('starting')
    try {
      stream = await openCamera()
    } catch (error) {
      const { name, message } = (error ?? {}) as Error
      console.error(`[detector] camera failed: ${name} ${message}`)
      setStatus(classifyCameraError(error))
      return
    }
    try {
      detector ??= await createFaceDetector()
      video = document.createElement('video')
      video.srcObject = stream
      video.muted = true
      video.playsInline = true
      await video.play()
    } catch (error) {
      // detector 창은 숨겨져 있어 콘솔이 보이지 않는다 → main 터미널에도 남긴다
      console.error('[detector] failed to start:', (error as Error)?.message ?? error)
      stop()
      setStatus('error')
      return
    }
    running = true
    engine = initialEngineState
    feedback = initialFeedback
    distance = initialDistanceState
    setStatus('running')
    loop()
  }

  function stop(): void {
    running = false
    clearTimeout(timer)
    clearInterval(previewTimer)
    previewTimer = undefined
    engine = initialEngineState
    feedback = initialFeedback
    distance = initialDistanceState
    closeCamera(stream)
    stream = null
    if (video) {
      video.srcObject = null
      video = null
    }
    setStatus('idle')
  }

  function subscribe<T>(set: Set<Listener<T>>, listener: Listener<T>): () => void {
    set.add(listener)
    return () => set.delete(listener)
  }

  return {
    start,
    stop,
    setBaseline: (next) => {
      baseline = next
    },
    calibrate: captureBaseline,
    setPreview: (on) => {
      clearInterval(previewTimer)
      previewTimer = on ? setInterval(sendPreview, PREVIEW_MS) : undefined
    },
    onPreview: (listener) => subscribe(previewListeners, listener),
    onUpdate: (listener) => subscribe(updateListeners, listener),
    onCalibration: (listener) => subscribe(calibrationListeners, listener),
    onStatus: (listener) => subscribe(statusListeners, listener)
  }
}
