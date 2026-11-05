import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CALIBRATION } from '@shared/ai/calibration'
import type { CalibrationPhase } from '@shared/detector'
import type { PostureView } from '@shared/ipc'
import { Button } from '@renderer/ui/Button'
import { Dialog } from '@renderer/ui/Dialog'
import { OnboardingHeader } from './OnboardingHeader'
import { OnboardingPanel } from './OnboardingPanel'

const SECONDS = CALIBRATION.durationMs / 1000

/** Figma 문구 (14:4442 얼굴 찾기 / 14:4667 기준 잡기) */
const COPY = {
  searching: {
    title: '얼굴이 보이도록 앉아주세요.',
    body: '점선 안에 얼굴과 어깨가 들어오면 자동으로 다음 단계로 넘어가요.'
  },
  ready: {
    title: '바른 자세로 앉은 뒤 기준을 잡아주세요.',
    // TODO(디자인): Figma 는 "버튼을 누르는 순간" 이지만 실제로는 5초를 재서 중앙값을 쓴다
    body: `지금 자세가 앞으로 교정할 기준이 돼요. 버튼을 누르면 ${SECONDS}초 동안 자세를 재요.`
  },
  measuring: {
    title: `${SECONDS}초 동안 그대로 있어 주세요.`,
    body: '정면을 보고 움직임을 줄이면 더 정확해요.'
  }
} as const

export default function Calibrate(): React.JSX.Element {
  const navigate = useNavigate()
  const isRecalibration = useLocation().pathname === '/recalibrate'
  const saved = useRef(false)

  const [face, setFace] = useState(false)
  const [phase, setPhase] = useState<CalibrationPhase>({ phase: 'idle' })
  const [done, setDone] = useState(false)

  useEffect(() => {
    window.api.posture.start()
    const offState = window.api.posture.onState((view: PostureView) => {
      // 얼굴이 보이는지만 본다 (판정은 기준이 있어야 돌아간다)
      setFace(view.feedback.phase !== 'UNAVAILABLE')
    })
    const offCalibration = window.api.posture.onCalibration((next) => {
      setPhase(next)
      if (next.phase !== 'complete' || saved.current) return
      saved.current = true
      void window.api.settings
        .saveCalibration(next.baseline, isRecalibration)
        .then(() => setDone(true))
    })
    return () => {
      offState()
      offCalibration()
    }
  }, [isRecalibration])

  const start = useCallback(() => {
    saved.current = false
    window.api.posture.calibrate()
  }, [])

  const collecting = phase.phase === 'collecting'
  const failed = phase.phase === 'failed'
  // 남은 초로 진행률을 만든다 (판정은 detector 가 한다)
  const progress = collecting ? 1 - phase.remainingSec / SECONDS : 0

  const copy = failed
    ? { title: '기준을 잡지 못했어요', body: phase.message }
    : collecting
      ? COPY.measuring
      : face
        ? COPY.ready
        : COPY.searching

  return (
    <div className="relative h-full w-full bg-grey-100">
      <OnboardingHeader current={face || collecting ? 3 : 2} />

      <OnboardingPanel title={copy.title} body={copy.body}>
        {collecting ? (
          <div
            className="h-2 w-full overflow-hidden rounded-pill bg-grey-300"
            role="progressbar"
            aria-valuenow={Math.round(progress * 100)}
          >
            <div
              className="h-full rounded-pill bg-main3 transition-[width] duration-300"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        ) : failed ? (
          <Button size="lg" className="w-full" onClick={start}>
            다시 시도
          </Button>
        ) : face ? (
          <Button size="lg" className="w-full" onClick={start}>
            기준 잡기
          </Button>
        ) : null}
      </OnboardingPanel>

      {done && (
        <Dialog
          title="기준 저장 완료"
          body={'이제 이 자세를 기준으로 살펴볼게요.\n기준은 설정에서 언제든 다시 잡을 수 있어요.'}
          confirmLabel="시작하기"
          // 설정에서 들어왔으면 설정으로, 온보딩이었으면 리포트로
          onConfirm={() => navigate(isRecalibration ? '/settings' : '/report', { replace: true })}
        />
      )}
    </div>
  )
}
