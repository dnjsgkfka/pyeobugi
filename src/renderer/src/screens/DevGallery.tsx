import { useState } from 'react'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Slider3, type Step } from '../ui/Slider3'
import { SpeechBubble } from '../ui/SpeechBubble'
import { Spinner } from '../ui/Spinner'
import { StatCard } from '../ui/StatCard'
import { StateBadge } from '../ui/Surface'
import {
  IconChevron,
  IconPause,
  IconPlay,
  IconRefresh,
  IconReport,
  IconReportActive,
  IconSettings,
  IconSettingsActive,
  IconStop,
  LogoFull,
  LogoSymbol
} from '../ui/icons'
import { Toggle } from '../ui/Toggle'
import { STATE_STYLE, barTone, type PostureState } from '../ui/state'

function Section({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="flex flex-col gap-4 rounded-lg bg-white p-6 shadow-card">
      <h2 className="text-heading text-grey-900">{title}</h2>
      <div className="flex flex-wrap items-center gap-4">{children}</div>
    </section>
  )
}

export default function DevGallery(): React.JSX.Element {
  const [on, setOn] = useState(true)
  const [step, setStep] = useState<Step>(1)
  const [dialog, setDialog] = useState<'one' | 'two' | null>(null)
  const states = Object.keys(STATE_STYLE) as PostureState[]

  return (
    <main className="mx-auto flex max-w-244 flex-col gap-6 p-10">
      <h1 className="text-title text-main1">디자인 시스템 갤러리</h1>

      <Section title="Button">
        <Button>Primary Small</Button>
        <Button size="lg">Primary Large</Button>
        <Button variant="secondary">Secondary</Button>
        <Button icon={<IconRefresh />}>다시 시도</Button>
        <Button disabled>Disabled</Button>
      </Section>

      <Section title="Toggle / Slider">
        <Toggle checked={on} onChange={setOn} label="공부 타이머" />
        <Toggle checked={!on} onChange={(v) => setOn(!v)} label="반대" />
        <div className="w-80">
          <Slider3 value={step} onChange={setStep} />
        </div>
      </Section>

      <Section title="상태 (state.ts)">
        {states.map((s) => (
          <StateBadge key={s} state={s} />
        ))}
        {[60, 75, 90].map((p) => (
          <div key={p} className="flex items-center gap-2 text-label text-grey-700">
            <span className={`h-6 w-6 rounded-sm ${barTone(p)}`} />
            {p}%
          </div>
        ))}
      </Section>

      <Section title="StatCard / SpeechBubble / Spinner">
        <StatCard
          title="정자세 유지율"
          parts={[{ value: '78', unit: '%' }]}
          note="어제보다 6%p 올랐어요"
        />
        <StatCard
          title="정자세 유지율"
          parts={[
            { value: '5', unit: '시간' },
            { value: '40', unit: '분' }
          ]}
          note="어제보다 6%p 올랐어요"
        />
        <SpeechBubble>스트레칭 할 시간이에요</SpeechBubble>
        <Spinner />
      </Section>

      <Section title="Icon / Logo">
        <span className="flex items-center gap-4 rounded-md bg-main1 p-4 text-grey-200">
          <IconReport />
          <IconReportActive />
          <IconSettings />
          <IconSettingsActive />
          <LogoSymbol />
          <LogoFull />
        </span>
        <span className="flex items-center gap-4 text-main1">
          <IconPlay />
          <IconPause />
          <IconStop />
        </span>
        <span className="text-grey-900">
          <IconChevron />
        </span>
      </Section>

      <Section title="Dialog">
        <Button onClick={() => setDialog('two')}>Two (거부/허용)</Button>
        <Button variant="secondary" onClick={() => setDialog('one')}>
          One
        </Button>
      </Section>

      {dialog && (
        <Dialog
          title={dialog === 'two' ? '카메라 권한을 허용하시겠습니까?' : '기준 저장 완료'}
          body={
            dialog === 'two'
              ? '펴부기가 자세를 감지하려면 카메라가 필요해요.\n카메라 영상은 기기 안에서만 처리돼요.'
              : '이제 이 자세를 기준으로 살펴볼게요.\n기준은 설정에서 언제든 다시 잡을 수 있어요.'
          }
          confirmLabel={dialog === 'two' ? '허용' : '시작하기'}
          cancelLabel={dialog === 'two' ? '거부' : undefined}
          onConfirm={() => setDialog(null)}
          onCancel={() => setDialog(null)}
        />
      )}
    </main>
  )
}
