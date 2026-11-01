import { useCallback, useEffect, useState } from 'react'
import type { Settings } from '@shared/schemas/settings'

/**
 * 설정을 읽고 바꾼다.
 * main 이 바뀔 때마다 모든 창에 알려주므로, 다른 창에서 바꿔도 따라간다.
 */
export function useSettings(): {
  settings: Settings | null
  update: (patch: Partial<Settings>) => void
} {
  const [settings, setSettings] = useState<Settings | null>(null)

  useEffect(() => {
    void window.api.settings.get().then(setSettings)
    return window.api.settings.onChange(setSettings)
  }, [])

  const update = useCallback((patch: Partial<Settings>) => {
    // 응답을 기다리지 않고 바로 반영한다 (토글이 뻑뻑하게 느껴지지 않도록)
    setSettings((current) => (current ? { ...current, ...patch } : current))
    void window.api.settings.update(patch)
  }, [])

  return { settings, update }
}
