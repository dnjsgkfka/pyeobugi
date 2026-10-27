import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuidV4(value: unknown): value is string {
  return typeof value === 'string' && UUID_V4.test(value)
}

/**
 * 익명 기기 ID(UUID v4)를 `dir/device.json` 에 저장하고 불러온다.
 * 파일이 없거나 깨졌으면 새로 발급한다 (기록이 끊기는 건 감수).
 * `dir` 은 Electron 의 `app.getPath('userData')` 를 넘긴다.
 */
export function loadOrCreateDeviceId(dir: string): string {
  const file = join(dir, 'device.json')
  try {
    const saved = JSON.parse(readFileSync(file, 'utf8')) as { deviceId?: unknown }
    if (isUuidV4(saved.deviceId)) return saved.deviceId
  } catch {
    // 없거나 깨진 파일 → 새로 발급
  }
  const deviceId = randomUUID()
  mkdirSync(dir, { recursive: true })
  writeFileSync(file, JSON.stringify({ deviceId }), 'utf8')
  return deviceId
}
