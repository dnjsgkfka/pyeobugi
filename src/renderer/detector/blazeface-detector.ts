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
  PostureDetector,
  PreviewFrame
} from '@shared/detector'
import { classifyCameraError } from './camera-error'
import { closeCamera, openCamera, sizeOfStream } from './camera'
import { createFaceDetector, detectFace, type FaceDetection } from './face-detector'

/**
 * 온보딩 프리뷰.
 * 카메라가 주는 해상도를 그대로 보낸다 — 창 폭(1280)보다 커도 줄이지 않는다.
 * 너무 커지면 IPC 가 버거워지므로 가로 1920 에서만 자른다.
 *
 * 주기를 100ms 에서 150ms 로 늘렸다. 프레임을 만드는 비용(캔버스 readback + JPEG 인코딩)이
 * 메모리의 대부분이었고, 얼굴을 맞추는 용도라 6~7fps 로도 충분하다.
 */
const PREVIEW_MS = 150
/** 카메라를 닫고 다시 열기까지 기다리는 시간 (윈도우가 장치를 놓아주는 데 걸림) */
const RELEASE_MS = 300
/** 기준을 잡을 때 '방금 본 얼굴' 로 인정하는 시간 */
const FRESH_MS = 1_500
const PREVIEW_MAX_WIDTH = 1920
const PREVIEW_QUALITY = 0.7

type Listener<T> = (value: T) => void

export function createBlazeFaceDetector(): PostureDetector {
  const updateListeners = new Set<Listener<DetectionUpdate>>()
  const statusListeners = new Set<Listener<DetectorStatus>>()
  const calibrationListeners = new Set<Listener<CalibrationPhase>>()
  const previewListeners = new Set<Listener<PreviewFrame>>()

  let detector: FaceDetector | null = null
  let stream: MediaStream | null = null
  let video: HTMLVideoElement | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  let previewTimer: ReturnType<typeof setInterval> | undefined
  let previewCanvas: HTMLCanvasElement | null = null
  /** 프리뷰 요청이 카메라보다 먼저 올 수 있어 상태를 들고 있는다 */
  let previewOn = false
  /** 지금 열린 스트림이 프리뷰(큰 해상도)로 열린 것인가 */
  let openedForPreview = false
  /** start() 가 겹쳐 들어와 카메라·모델이 두 개 뜨는 것을 막는다 */
  let starting: Promise<void> | null = null
  /** 카메라 열기 직렬화용 체인 */
  let attaching: Promise<void> = Promise.resolve()
  let running = false
  /** JPEG 인코딩이 겹치지 않게 한 장씩만 */
  let encoding = false
  /** 루프가 방금 찾은 얼굴. 프리뷰가 재사용한다 (추론을 두 번 돌리지 않는다) */
  let lastFace: FaceDetection | null = null

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
   * 다만 엔진은 얼굴을 놓쳐도 3초는 직전 값을 들고 있으므로,
   * 누르는 순간에 얼굴이 실제로 보이는지 다시 확인한다 (손으로 가리고 눌러도 저장되면 안 된다).
   */
  function captureBaseline(): void {
    if (!running) return
    const missing = '얼굴이 보이지 않아요. 화면을 보고 다시 눌러 주세요.'

    const found = detector && video ? detectFace(detector, video) : null
    if (!found?.sample) {
      emitCalibration({ phase: 'failed', message: missing })
      return
    }
    const fresh = engine.lastSeenAt !== null && Date.now() - engine.lastSeenAt < FRESH_MS
    if (!engine.present || engine.pitch === null || engine.size === null || !fresh) {
      // 엔진이 아직 이 얼굴을 못 받았다 → 평활값 대신 방금 본 값으로 잡는다
      const next: Baseline = { pitch: found.sample.pitch, size: found.sample.size }
      finishCalibration(next)
      return
    }
    finishCalibration({ pitch: engine.pitch, size: engine.size })
  }

  function finishCalibration(next: Baseline): void {
    // 기준이 바뀌었으니 진행 중이던 판정은 끝낸다 (RECALIBRATED)
    const reset = resetPosture(engine, Date.now())
    engine = reset.state
    distance = initialDistanceState
    pendingTransitions.push(...reset.transitions)
    emitCalibration({ phase: 'complete', baseline: next })
  }

  /** 다음 추론 때 함께 내보낼 전이 (기준 재설정처럼 루프 밖에서 생긴 것) */
  const pendingTransitions: Transition[] = []

  const toJpeg = (canvas: HTMLCanvasElement): Promise<Blob | null> =>
    new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', PREVIEW_QUALITY))

  /**
   * 프리뷰: JPEG 바이트와 얼굴 점만 내보내고 원본 프레임은 이 창에 남는다.
   * 얼굴은 루프가 찾아 둔 것을 재사용한다 — 프리뷰가 켜져 있는 동안은 루프도 PREVIEW_MS 로
   * 돌기 때문에 점이 그대로 따라온다 (예전에는 여기서 추론을 한 번 더 돌렸다).
   */
  async function sendPreview(): Promise<void> {
    if (!video || video.videoWidth === 0 || encoding) return
    // 카메라가 주는 크기 그대로 (아주 큰 경우에만 줄인다)
    const scale = Math.min(1, PREVIEW_MAX_WIDTH / video.videoWidth)
    const width = Math.round(video.videoWidth * scale)
    const height = Math.round(video.videoHeight * scale)
    if (!previewCanvas || previewCanvas.width !== width || previewCanvas.height !== height) {
      previewCanvas = document.createElement('canvas')
      previewCanvas.width = width
      previewCanvas.height = height
    }
    const canvas = previewCanvas
    const context = canvas.getContext('2d')
    if (!context) return
    context.drawImage(video, 0, 0, width, height)

    encoding = true
    try {
      const blob = await toJpeg(canvas)
      // 기다리는 동안 멈췄을 수 있다
      if (!blob || !running) return
      const found = lastFace
      const preview: PreviewFrame = {
        frame: new Uint8Array(await blob.arrayBuffer()),
        face: found
          ? { box: found.box, keypoints: found.keypoints, ok: found.sample !== null }
          : null
      }
      previewListeners.forEach((listener) => listener(preview))
    } finally {
      encoding = false
    }
  }

  function loop(): void {
    if (!running || !detector || !video) return
    const now = Date.now()
    const found = detectFace(detector, video)
    lastFace = found
    const face = found?.sample ?? null

    const transitions: Transition[] = pendingTransitions.splice(0)
    const stepped = stepEngine(engine, { at: now, face }, baseline)
    engine = stepped.state
    transitions.push(...stepped.transitions)

    feedback = updateFeedback(feedback, engine, now, baseline !== null, transitions)
    distance = stepDistance(distance, now, face?.size ?? null, baseline)

    // 프리뷰가 켜져 있으면 점이 끊겨 보이지 않게 촘촘히 돈다.
    // 추론 입력은 320px 고정이라 이 주기에서도 비용이 작다
    const base = nextIntervalMs(engine, now)
    const intervalMs = previewOn ? Math.min(PREVIEW_MS, base) : base
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
      intervalMs,
      // 확정 전부터 목이 늘어날 수 있게 '후보가 된 시각' 을 함께 넘긴다.
      // engine.pendingSince 는 BAD 중에는 복귀 타이머로 쓰이므로 그때는 넘기지 않는다
      badCandidateSince: engine.bad ? null : engine.pendingSince
    }
    updateListeners.forEach((listener) => listener(update))
    timer = setTimeout(loop, intervalMs)
  }

  /** 카메라를 열어 video 에 붙인다. 프리뷰면 큰 해상도로 연다 */
  async function attachNow(preview: boolean): Promise<void> {
    // 같은 카메라를 두 번 열면 먼저 열린 형식(320×240)을 그대로 돌려주는 장치가 있다.
    // 그래서 해상도를 바꿀 때는 먼저 닫고 나서 연다.
    if (stream) {
      closeCamera(stream)
      stream = null
      // 닫은 직후에 바로 열면 장치가 아직 점유돼 AbortError 가 난다
      await new Promise((resolve) => setTimeout(resolve, RELEASE_MS))
    }
    const next = await openCamera(preview)
    stream = next
    openedForPreview = preview
    video ??= document.createElement('video')
    video.srcObject = next
    video.muted = true
    video.playsInline = true
    await video.play()
    console.log(`[detector] camera ${sizeOfStream(next)}${preview ? ' (preview)' : ''}`)
  }

  /**
   * 카메라 열기를 한 줄로 세운다.
   * 시작과 프리뷰 전환이 겹치면 앞의 `play()` 가 뒤의 `srcObject` 교체로 취소돼
   * AbortError 로 시작이 실패한다.
   */
  function attach(preview: boolean): Promise<void> {
    const run = async (): Promise<void> => {
      if (stream && openedForPreview === preview) return
      await attachNow(preview)
    }
    const next = attaching.then(run, run)
    attaching = next.then(
      () => undefined,
      () => undefined
    )
    return next
  }

  async function start(): Promise<void> {
    if (running) return
    if (starting) return starting
    starting = (async () => {
      setStatus('starting')
      try {
        await attach(previewOn)
      } catch (error) {
        const { name, message } = (error ?? {}) as Error
        console.error(`[detector] camera failed: ${name} ${message}`)
        setStatus(classifyCameraError(error))
        return
      }
      try {
        detector ??= await createFaceDetector()
      } catch (error) {
        // detector 창은 숨겨져 있어 콘솔이 보이지 않는다 → main 터미널에도 남긴다
        console.error('[detector] failed to start:', (error as Error)?.message ?? error)
        stop()
        setStatus('error')
        return
      }
      running = true
      if (previewOn) previewTimer ??= setInterval(() => void sendPreview(), PREVIEW_MS)
      engine = initialEngineState
      feedback = initialFeedback
      distance = initialDistanceState
      setStatus('running')
      loop()
    })().finally(() => {
      starting = null
    })
    return starting
  }

  function stop(): void {
    running = false
    clearTimeout(timer)
    clearInterval(previewTimer)
    previewTimer = undefined
    previewCanvas = null
    previewOn = false
    lastFace = null
    openedForPreview = false
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
      previewOn = on
      clearInterval(previewTimer)
      previewTimer = on && running ? setInterval(() => void sendPreview(), PREVIEW_MS) : undefined
      // 켜 둔 스트림의 해상도 변경을 거부하는 카메라가 있어서, 프리뷰는 다시 열어 바꾼다.
      // 아직 안 열렸으면 start() 가 이 상태를 보고 알맞게 연다
      if (!running || openedForPreview === on) return
      void attach(on).catch((error: unknown) => {
        console.warn(`[detector] could not reopen camera: ${(error as Error)?.name}`)
      })
    },
    onPreview: (listener) => subscribe(previewListeners, listener),
    onUpdate: (listener) => subscribe(updateListeners, listener),
    onCalibration: (listener) => subscribe(calibrationListeners, listener),
    onStatus: (listener) => subscribe(statusListeners, listener)
  }
}
