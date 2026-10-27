import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isUuidV4, loadOrCreateDeviceId } from './device'

function tmp(): string {
  return mkdtempSync(join(tmpdir(), 'turtle-device-'))
}

describe('deviceId', () => {
  it('처음 실행하면 UUID v4 를 발급해 저장한다', () => {
    const dir = tmp()
    const id = loadOrCreateDeviceId(dir)
    expect(isUuidV4(id)).toBe(true)
    expect(JSON.parse(readFileSync(join(dir, 'device.json'), 'utf8')).deviceId).toBe(id)
  })

  it('다시 불러오면 같은 ID 다', () => {
    const dir = tmp()
    expect(loadOrCreateDeviceId(dir)).toBe(loadOrCreateDeviceId(dir))
  })

  it('파일이 깨졌거나 형식이 틀리면 새로 발급한다', () => {
    const dir = tmp()
    writeFileSync(join(dir, 'device.json'), '{not json', 'utf8')
    const a = loadOrCreateDeviceId(dir)
    expect(isUuidV4(a)).toBe(true)
    writeFileSync(join(dir, 'device.json'), JSON.stringify({ deviceId: 'abc' }), 'utf8')
    expect(isUuidV4(loadOrCreateDeviceId(dir))).toBe(true)
  })
})
