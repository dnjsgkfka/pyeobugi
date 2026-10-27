import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Settings as SettingsValue } from '@shared/schemas/settings'
import { Button } from '@renderer/ui/Button'
import { IconRefresh } from '@renderer/ui/icons'

/** 설정 화면. 지금은 기준 자세 재설정만 있고, 나머지 항목은 다음 이슈에서 채운다. */
export default function Settings(): React.JSX.Element {
  const navigate = useNavigate()
  const [settings, setSettings] = useState<SettingsValue | null>(null)

  useEffect(() => {
    void window.api.settings.get().then(setSettings)
  }, [])

  return (
    <main className="mx-auto flex max-w-244 flex-col gap-5 p-10">
      <h1 className="text-title text-grey-900">설정</h1>

      <section className="flex flex-col gap-6 rounded-lg bg-white p-4 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-body-b text-grey-900">기준 자세</span>
            <span className="text-label text-grey-700">
              자리나 모니터 위치가 바뀌었다면 다시 잡아주세요
            </span>
          </div>
          <Button icon={<IconRefresh />} onClick={() => navigate('/recalibrate')}>
            기준 다시 잡기
          </Button>
        </div>
        {settings?.baseline && (
          <span className="text-caption text-grey-500">
            마지막으로 잡은 시각 {settings.baseline.savedAt.slice(0, 16).replace('T', ' ')}
          </span>
        )}
      </section>
    </main>
  )
}
