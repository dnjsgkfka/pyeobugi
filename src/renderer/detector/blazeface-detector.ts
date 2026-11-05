/**
 * AI 파트 모듈(kayo2e/pyeobugi-AI 의 `useDetection`)의 루프를 우리 detector 창 구조에 맞게 옮긴 구현.
 * 훅 대신 평범한 함수로 두었고, 카메라만 우리 장치 선택 로직을 쓴다 (AI 쪽은 기본 장치만 연다).
 *
 * - 추론 주기는 적응형: 평소 1초 / 자세가 바뀌는 중 0.25초 / 자리비움 1분 뒤 3초
 * - 기준값은 설정(main)에서 받아 넣는다. AI 레포의 zustand store 는 쓰지 않는다
 * - 영상·키포인트는 이 창 밖으로 나가지 않는다
 */
import type { FaceDetector } from '@mediapipe/tasks-vision'
import { evaluateCalibration } from '@shared/ai/calibration'
import { initialDistanceState, stepDistance } from '@shared/ai/distance'
import {
  initialEngineState,
  nextIntervalMs,
  resetPosture,
  stepEngine,
  type EngineState,
  type Sample,
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

/** 기준을 잡는 동안에는 촘촘히 본다 (AI 레포와 같은 값) */
const CALIBRATION_INTERVAL_MS = 500

type Listener<T> = (value: T) => void

export function createBlazeFaceDetector(): PostureDetector {
  const updateListeners = new Set<Listener<DetectionUpdate>>()
  const statusListeners = new Set<Listener<DetectorStatus>>()
  const calibrationListeners = new Set<Listener<CalibrationPhase>>()

  let detector: FaceDetector | null = null
  let stream: MediaStream | null = null
  let video: HTMLVideoElement | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  let running = false

  let baseline: Baseline | null = null
  let engine: EngineState = initialEngineState
  let feedback: PostureFeedback = initialFeedback
  let distance = initialDistanceState
  let collecting: { startedAt: number; samples: Sample[] } | null = null

  function setStatus(next: DetectorStatus): void {
    statusListeners.forEach((listener) => listener(next))
  }

  function emitCalibration(phase: CalibrationPhase): void {
    calibrationListeners.forEach((listener) => listener(phase))
  }

  /** 기준을 잡는 중이면 샘플을 모아 판정한다. 완료되면 판정 상태를 비운다. */
  function stepCalibration(now: number, face: Sample['face']): Transition[] {
    if (!collecting) return []
    collecting.samples.push({ at: now, face })
    const result = evaluateCalibration(collecting.samples, collecting.startedAt)
    emitCalibration(result)
    if (result.phase !== 'collecting') collecting = null
    if (result.phase !== 'complete') return []
    // 기준이 바뀌었으니 진행 중이던 판정은 끝낸다 (RECALIBRATED)
    const reset = resetPosture(engine, now)
    engine = reset.state
    distance = initialDistanceState
    return reset.transitions
  }

  function loop(): void {
    if (!running || !detector || !video) return
    const now = Date.now()
    const found = detectFace(detector, video)
    const face = found?.sample ?? null

    const transitions: Transition[] = stepCalibration(now, face)
    const stepped = stepEngine(engine, { at: now, face }, baseline)
    engine = stepped.state
    transitions.push(...stepped.transitions)

    feedback = updateFeedback(feedback, engine, now, baseline !== null, transitions)
    distance = collecting
      ? initialDistanceState
      : stepDistance(distance, now, face?.size ?? null, baseline)

    const intervalMs = collecting ? CALIBRATION_INTERVAL_MS : nextIntervalMs(engine, now)
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
    collecting = null
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
    calibrate: () => {
      if (!running || collecting) return
      collecting = { startedAt: Date.now(), samples: [] }
      emitCalibration({ phase: 'collecting', remainingSec: 5 })
    },
    onUpdate: (listener) => subscribe(updateListeners, listener),
    onCalibration: (listener) => subscribe(calibrationListeners, listener),
    onStatus: (listener) => subscribe(statusListeners, listener)
  }
}
