/**
 * 카메라 열기. 가상 카메라(시선 추적·방송용)는 열리지 않는 경우가 많아 뒤로 미루고,
 * 실패하면 다음 장치로 넘어간다. AI 파트 모듈은 기본 장치만 열기 때문에 이 선택 로직을 쓴다.
 */

/** 열리지 않는 가상 카메라(시선 추적·방송용 등)는 뒤로 미룬다. */
const VIRTUAL = /virtual|obs|snap|manycam|droidcam|mirametrix|xsplit|nvidia broadcast/i

/** AI 파트와 같은 조건 (320×240, 5fps) — 추론을 가볍게 하려고 작게 연다 */
const SIZE = { width: { ideal: 320 }, height: { ideal: 240 } }
const FRAME_RATE = { ideal: 5, max: 10 }

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

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
      ...SIZE,
      frameRate: FRAME_RATE
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
export async function openCamera(): Promise<MediaStream> {
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

export function closeCamera(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop())
}
