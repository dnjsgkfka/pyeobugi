import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { DEFAULT_SETTINGS, SettingsSchema, type Settings } from '@shared/schemas/settings'

/**
 * settings.json 저장소. 큐와 같은 방식(임시 파일 → rename)으로 안전하게 쓴다.
 * 파일이 없거나 깨졌으면 기본값으로 시작한다 = 첫 실행으로 본다.
 */
export class SettingsStore {
  private settings: Settings

  constructor(private readonly filePath: string) {
    this.settings = this.load()
  }

  get value(): Settings {
    return this.settings
  }

  /** 일부 필드만 바꿔 저장한다. */
  update(patch: Partial<Settings>): Settings {
    this.settings = { ...this.settings, ...patch }
    this.persist()
    return this.settings
  }

  private load(): Settings {
    try {
      const raw: unknown = JSON.parse(readFileSync(this.filePath, 'utf8'))
      const parsed = SettingsSchema.safeParse(raw)
      if (parsed.success) return parsed.data
      // 필드가 늘어난 경우를 위해 기본값과 합쳐 한 번 더
      const merged = SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, ...(raw as object) })
      if (merged.success) return merged.data
    } catch {
      // 없거나 깨진 파일 → 첫 실행
    }
    return DEFAULT_SETTINGS
  }

  private persist(): void {
    const tmp = `${this.filePath}.tmp`
    try {
      mkdirSync(dirname(this.filePath), { recursive: true })
      writeFileSync(tmp, JSON.stringify(this.settings, null, 2), 'utf8')
      renameSync(tmp, this.filePath)
    } catch (error) {
      console.error('[settings] failed to save:', (error as Error).message)
    }
  }
}
