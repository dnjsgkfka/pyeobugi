import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import type { DetectorStatus, PostureSample } from '@shared/detector'
import { classifyCameraError } from './camera-error'
import { MovingAverage, pitchFromMatrix, sizeFromLandmarks } from './pitch'

const SMOOTHING_FRAMES = 5
/**
 * 모델과 wasm 은 앱 안에 둔다 (오프라인에서도 동작).
 * 이 페이지는 `/detector/index.html` 이고 파일은 그 위 폴더에 있으므로 `../` 로 찾는다.
 * (dev 의 http, 배포의 file: 둘 다 같은 식으로 풀린다)
 */
const asset = (path: string): string => new URL(`../mediapipe/${path}`, document.baseURI).href
const WASM_PATH = asset('wasm')
const MODEL_PATH = asset('face_landmarker.task')

/**
 * 비교용으로 남긴 기존 구현 (Face Landmarker + 얼굴 변환 행렬에서 pitch).
 * 지금 쓰이는 것은 BlazeFace 기반 `blazeface-detector.ts` 이고, 이 파일은
 * #24 의 "변환 행렬 방식과 키포인트 근사 방식의 pitch 비교" 를 위해 둔다.
 */
export interface LandmarkerDetector {
  start: () => Promise<void>
  stop: () => void
  onSample: (listener: (sample: PostureSample) => void) => () => void
  onStatus: (listener: (status: DetectorStatus) => void) => () => void
}

type Listener<T> = (value: T) => void

export function createMediaPipeDetector(): LandmarkerDetector {
  const sampleListeners = new Set<Listener<PostureSample>>()
  const statusListeners = new Set<Listener<DetectorStatus>>()
  const pitchAvg = new MovingAverage(SMOOTHING_FRAMES)
  const sizeAvg = new MovingAverage(SMOOTHING_FRAMES)

  let landmarker: FaceLandmarker | null = null
  let stream: MediaStream | null = null
  let video: HTMLVideoElement | null = null
  let frame = 0
  let running = false
  let lastVideoTime = -1

  function setStatus(next: DetectorStatus): void {
    statusListeners.forEach((listener) => listener(next))
  }

  function emit(sample: PostureSample): void {
    sampleListeners.forEach((listener) => listener(sample))
  }

  async function loadLandmarker(): Promise<FaceLandmarker> {
    if (landmarker) return landmarker
    const fileset = await FilesetResolver.forVisionTasks(WASM_PATH)
    landmarker = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_PATH, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numFaces: 1,
      // pitch 를 얻으려면 이 행렬이 필요하다. 랜드마크·행렬 모두 기기 밖으로 나가지 않는다.
      outputFacialTransformationMatrixes: true
    })
    return landmarker
  }

  function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /** 열리지 않는 가상 카메라(시선 추적·방송용 등)는 뒤로 미룬다. */
  const VIRTUAL = /virtual|obs|snap|manycam|droidcam|mirametrix|xsplit|nvidia broadcast/i

  async function listCameras(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cameras = devices.filter((device) => device.kind === 'videoinput')
      // 이름이 비어 있으면(권한 전) 순서를 그대로 둔다
      return [
        ...cameras.filter((device) => !VIRTUAL.test(device.label)),
        ...cameras.filter((device) => VIRTUAL.test(device.label))
      ]
    } catch {
      return []
    }
  }

  function constraints(deviceId?: string): MediaStreamConstraints {
    return {
      video: {
        ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 15 }
      },
      audio: false
    }
  }

  async function tryOpen(device?: MediaDeviceInfo): Promise<MediaStream> {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints(device?.deviceId))
    } catch (error) {
      // 해상도·프레임을 못 맞추는 카메라가 있다 → 조건 없이 한 번 더
      if ((error as Error)?.name !== 'OverconstrainedError') throw error
      return navigator.mediaDevices.getUserMedia({
        video: device ? { deviceId: { exact: device.deviceId } } : true,
        audio: false
      })
    }
  }

  /**
   * 카메라를 하나씩 시도한다.
   * 가상 카메라는 열리지 않고 AbortError(Timeout starting video source) 로 끝나는 경우가
   * 많아, 실패하면 다음 장치로 넘어간다. 장치 목록을 못 얻으면 기본 장치로만 시도한다.
   */
  async function openCamera(): Promise<MediaStream> {
    const cameras = await listCameras()
    const candidates: (MediaDeviceInfo | undefined)[] = cameras.length > 0 ? cameras : [undefined]
    let lastError: unknown = new DOMException('no camera', 'NotFoundError')

    for (const device of candidates) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          return await tryOpen(device)
        } catch (error) {
          lastError = error
          const name = (error as Error)?.name
          console.warn(`[detector] camera "${device?.label ?? 'default'}" failed: ${name}`)
          // 잠깐 못 여는 것뿐일 수 있다 → 같은 장치로 한 번만 더
          if (name !== 'AbortError' && name !== 'NotReadableError') break
          await wait(500)
        }
      }
    }
    throw lastError
  }

  function tick(): void {
    if (!running || !video || !landmarker) return
    frame = requestAnimationFrame(tick)

    // 같은 프레임을 두 번 넣으면 MediaPipe 가 오류를 낸다
    if (video.currentTime === lastVideoTime || video.readyState < 2) return
    lastVideoTime = video.currentTime

    const now = performance.now()
    const result = landmarker.detectForVideo(video, now)
    const landmarks = result.faceLandmarks?.[0]
    const matrix = result.facialTransformationMatrixes?.[0]

    if (!landmarks || !matrix) {
      // 얼굴이 사라지면 평균도 비운다 (다시 잡혔을 때 옛 값이 섞이지 않게)
      pitchAvg.reset()
      sizeAvg.reset()
      emit({ t: now, face: false, pitch: null, size: null })
      return
    }

    emit({
      t: now,
      face: true,
      pitch: pitchAvg.push(pitchFromMatrix(matrix)),
      size: sizeAvg.push(sizeFromLandmarks(landmarks))
    })
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
      await loadLandmarker()
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
    lastVideoTime = -1
    setStatus('running')
    frame = requestAnimationFrame(tick)
  }

  function stop(): void {
    running = false
    cancelAnimationFrame(frame)
    pitchAvg.reset()
    sizeAvg.reset()
    stream?.getTracks().forEach((track) => track.stop())
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
    onSample: (listener) => subscribe(sampleListeners, listener),
    onStatus: (listener) => subscribe(statusListeners, listener)
  }
}
