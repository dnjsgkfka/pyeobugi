import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuidV4(value: unknown): value is string {
  return typeof value === 'string' && UUID_V4.test(value)
}

/** 기기 식별 정보. secret 은 아직 등록하지 않았으면 null */
export interface Device {
  deviceId: string
  deviceSecret: string | null
}

function file(dir: string): string {
  return join(dir, 'device.json')
}

/** 원자적 쓰기 (tmp + rename). 쓰다 죽어도 반쯤 쓰인 파일이 남지 않는다 */
function write(dir: string, device: Device): void {
  const target = file(dir)
  const tmp = `${target}.tmp`
  mkdirSync(dir, { recursive: true })
  writeFileSync(tmp, JSON.stringify(device), 'utf8')
  renameSync(tmp, target)
}

/**
 * 익명 기기 ID(UUID v4)와 기기 secret 을 `dir/device.json` 에 저장하고 불러온다.
 * 파일이 없거나 깨졌으면 새로 발급한다 (기록이 끊기는 건 감수).
 * secret 이 없던 구버전 파일(`{ deviceId }`)도 그대로 읽는다.
 * `dir` 은 Electron 의 `app.getPath('userData')` 를 넘긴다.
 */
export function loadOrCreateDevice(dir: string): Device {
  try {
    const saved = JSON.parse(readFileSync(file(dir), 'utf8')) as {
      deviceId?: unknown
      deviceSecret?: unknown
    }
    if (isUuidV4(saved.deviceId)) {
      const secret =
        typeof saved.deviceSecret === 'string' && saved.deviceSecret ? saved.deviceSecret : null
      return { deviceId: saved.deviceId, deviceSecret: secret }
    }
  } catch {
    // 없거나 깨진 파일 → 새로 발급
  }
  const device: Device = { deviceId: randomUUID(), deviceSecret: null }
  write(dir, device)
  return device
}

/** 등록해서 받은 secret 을 저장한다 */
export function saveDeviceSecret(dir: string, device: Device, deviceSecret: string): Device {
  const next: Device = { deviceId: device.deviceId, deviceSecret }
  write(dir, next)
  return next
}

/**
 * 새 기기 ID 를 발급한다 (secret 없음).
 * secret 을 잃어버렸는데 서버가 이미 등록된 기기라고 하는 경우에만 쓴다 — 기록은 끊긴다.
 */
export function resetDevice(dir: string): Device {
  const device: Device = { deviceId: randomUUID(), deviceSecret: null }
  write(dir, device)
  return device
}
