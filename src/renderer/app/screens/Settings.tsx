import { useNavigate } from 'react-router-dom'
import type { Settings as SettingsValue } from '@shared/schemas/settings'
import { Button } from '@renderer/ui/Button'
import { Slider3, type Step } from '@renderer/ui/Slider3'
import { Toggle } from '@renderer/ui/Toggle'
import { IconRefresh } from '@renderer/ui/icons'
import { useSettings } from '../useSettings'

type FeatureKey = keyof SettingsValue['features']

const FEATURES: { key: FeatureKey; title: string; description: string }[] = [
  { key: 'studyTimer', title: '공부 타이머', description: '뽀모도로 타이머를 함께 사용해요' },
  { key: 'stretch', title: '스트레칭 알림', description: '오래 앉아 있으면 스트레칭을 권해요' },
  {
    key: 'awayPause',
    title: '자리비움 시 카메라 꺼짐',
    description: '자리를 비우면 카메라를 자동으로 꺼요'
  },
  {
    key: 'overlay',
    title: '거북이 오버레이 표시',
    description: '자세가 무너지면 화면 위에 거북이가 나타나요'
  }
]

/** 카드 — padding 16, gap 24, white, radius 12 */
function Card({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <section className="flex flex-col gap-6 rounded-lg bg-white p-4 shadow-card">
      {children}
    </section>
  )
}

/** 제목 + 설명 (gap 4) */
function Labels({ title, description }: { title: string; description: string }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-body-b text-grey-900">{title}</span>
      <span className="text-label text-grey-700">{description}</span>
    </div>
  )
}

export default function Settings(): React.JSX.Element {
  const navigate = useNavigate()
  const { settings, update } = useSettings()

  if (!settings) return <></>

  return (
    <>
      <h1 className="text-title text-grey-900">설정</h1>

      <Card>
        <span className="text-body-b text-grey-900">시간대별 정자세 비율</span>

        <div className="flex flex-col gap-6">
          <Labels title="교정 강도" description="강할수록 조금만 숙여도 바로 알려줘요" />
          <Slider3
            value={settings.sensitivity as Step}
            onChange={(value) => update({ sensitivity: value })}
          />
        </div>

        <div className="flex items-center justify-between">
          <Labels title="기준 자세" description="자리나 모니터 위치가 바뀌었다면 다시 잡아주세요" />
          <Button icon={<IconRefresh />} onClick={() => navigate('/recalibrate')}>
            기준 다시 잡기
          </Button>
        </div>
      </Card>

      <Card>
        <span className="text-body-b text-grey-900">기능</span>
        {FEATURES.map(({ key, title, description }) => (
          <div key={key} className="flex items-center justify-between">
            <Labels title={title} description={description} />
            <Toggle
              label={title}
              checked={settings.features[key]}
              onChange={(value) => update({ features: { ...settings.features, [key]: value } })}
            />
          </div>
        ))}
      </Card>
    </>
  )
}
