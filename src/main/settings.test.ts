import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/schemas/settings'
import { SettingsStore } from './settings'

let file: string
beforeEach(() => {
  file = join(mkdtempSync(join(tmpdir(), 'turtle-settings-')), 'settings.json')
})

describe('SettingsStore', () => {
  it('파일이 없으면 기본값이고 onboarded 는 false (첫 실행)', () => {
    expect(new SettingsStore(file).value).toEqual(DEFAULT_SETTINGS)
    expect(new SettingsStore(file).value.onboarded).toBe(false)
  })

  it('저장하면 다음 실행에서 그대로 읽는다', () => {
    const store = new SettingsStore(file)
    store.update({
      onboarded: true,
      baseline: { pitch: 7.5, size: 0.42, savedAt: '2026-10-27T11:00:00+09:00' }
    })
    const next = new SettingsStore(file)
    expect(next.value.onboarded).toBe(true)
    expect(next.value.baseline?.pitch).toBe(7.5)
  })

  it('일부만 바꿔도 나머지는 그대로다', () => {
    const store = new SettingsStore(file)
    store.update({ sensitivity: 2 })
    expect(store.value.features).toEqual(DEFAULT_SETTINGS.features)
    expect(store.value.sensitivity).toBe(2)
  })

  it('파일이 깨졌으면 기본값으로 시작한다', () => {
    writeFileSync(file, '{not json', 'utf8')
    expect(new SettingsStore(file).value).toEqual(DEFAULT_SETTINGS)
  })

  it('필드가 모자란 예전 파일은 기본값으로 채운다', () => {
    writeFileSync(file, JSON.stringify({ onboarded: true }), 'utf8')
    const store = new SettingsStore(file)
    expect(store.value.onboarded).toBe(true)
    expect(store.value.sensitivity).toBe(DEFAULT_SETTINGS.sensitivity)
  })

  it('값이 잘못된 파일은 기본값으로 되돌린다', () => {
    writeFileSync(file, JSON.stringify({ ...DEFAULT_SETTINGS, sensitivity: 9 }), 'utf8')
    expect(new SettingsStore(file).value.sensitivity).toBe(DEFAULT_SETTINGS.sensitivity)
  })

  it('사람이 읽을 수 있는 형태로 저장한다', () => {
    new SettingsStore(file).update({ onboarded: true })
    expect(readFileSync(file, 'utf8')).toContain('\n  "onboarded": true')
  })
})
