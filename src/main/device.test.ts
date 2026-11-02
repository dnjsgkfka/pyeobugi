import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isUuidV4, loadOrCreateDevice, resetDevice, saveDeviceSecret } from './device'

function tmp(): string {
  return mkdtempSync(join(tmpdir(), 'turtle-device-'))
}

function saved(dir: string): { deviceId?: string; deviceSecret?: string } {
  return JSON.parse(readFileSync(join(dir, 'device.json'), 'utf8'))
}

describe('기기 식별', () => {
  it('처음 실행하면 UUID v4 를 발급해 저장한다 (secret 은 아직 없음)', () => {
    const dir = tmp()
    const device = loadOrCreateDevice(dir)
    expect(isUuidV4(device.deviceId)).toBe(true)
    expect(device.deviceSecret).toBeNull()
    expect(saved(dir).deviceId).toBe(device.deviceId)
  })

  it('다시 불러오면 같은 ID 다', () => {
    const dir = tmp()
    expect(loadOrCreateDevice(dir).deviceId).toBe(loadOrCreateDevice(dir).deviceId)
  })

  it('파일이 깨졌거나 형식이 틀리면 새로 발급한다', () => {
    const dir = tmp()
    writeFileSync(join(dir, 'device.json'), '{not json', 'utf8')
    expect(isUuidV4(loadOrCreateDevice(dir).deviceId)).toBe(true)
    writeFileSync(join(dir, 'device.json'), JSON.stringify({ deviceId: 'abc' }), 'utf8')
    expect(isUuidV4(loadOrCreateDevice(dir).deviceId)).toBe(true)
  })

  it('secret 이 없던 구버전 파일도 그대로 읽는다', () => {
    const dir = tmp()
    const deviceId = loadOrCreateDevice(dir).deviceId
    writeFileSync(join(dir, 'device.json'), JSON.stringify({ deviceId }), 'utf8')
    expect(loadOrCreateDevice(dir)).toEqual({ deviceId, deviceSecret: null })
  })

  it('secret 을 저장하면 다시 불러올 때 함께 온다', () => {
    const dir = tmp()
    const device = saveDeviceSecret(dir, loadOrCreateDevice(dir), 'secret-1')
    expect(device.deviceSecret).toBe('secret-1')
    expect(saved(dir).deviceSecret).toBe('secret-1')
    expect(loadOrCreateDevice(dir)).toEqual(device)
  })

  it('기기 ID 를 새로 발급하면 secret 은 비워진다', () => {
    const dir = tmp()
    const before = saveDeviceSecret(dir, loadOrCreateDevice(dir), 'secret-1')
    const after = resetDevice(dir)
    expect(after.deviceId).not.toBe(before.deviceId)
    expect(after.deviceSecret).toBeNull()
    expect(loadOrCreateDevice(dir)).toEqual(after)
  })
})
