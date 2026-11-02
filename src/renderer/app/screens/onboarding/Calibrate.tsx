import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CalibrationCollector,
  FaceTracker,
  type Baseline,
  type CalibrationState,
  type FaceState
} from '@shared/calibration'
import { Button } from '@renderer/ui/Button'
import { Dialog } from '@renderer/ui/Dialog'
import { OnboardingHeader } from './OnboardingHeader'
import { OnboardingPanel } from './OnboardingPanel'

/** Figma 문구 (14:4442 얼굴 찾기 / 14:4667 기준 잡기) */
const COPY = {
  searching: {
    title: '얼굴이 보이도록 앉아주세요.',
    body: '점선 안에 얼굴과 어깨가 들어오면 자동으로 다음 단계로 넘어가요.'
  },
  ready: {
    title: '바른 자세로 앉은 뒤 기준을 잡아주세요.',
    body: '지금 자세가 앞으로 교정할 기준이 돼요. 버튼을 누르는 순간의 위치가 저장돼요.'
  },
  'face-lost': {
    title: '얼굴을 놓쳤어요',
    body: '재는 동안 얼굴이 보이지 않았어요.\n자리에 앉은 채로 다시 시도해 주세요.'
  },
  'not-enough-samples': {
    title: '기준을 잡지 못했어요',
    body: '얼굴이 잘 보이지 않았어요.\n조명을 밝게 하고 다시 시도해 주세요.'
  }
} as const

export default function Calibrate(): React.JSX.Element {
  const navigate = useNavigate()
  const isRecalibration = useLocation().pathname === '/recalibrate'
  const collector = useRef(new CalibrationCollector())
  const tracker = useRef(new FaceTracker())
  const saved = useRef(false)
  /** 버튼을 누른 뒤부터 3초를 재기 시작한다 */
  const measuring = useRef(false)

  const [face, setFace] = useState<FaceState>('searching')
  const [armed, setArmed] = useState(false)
  const [state, setState] = useState<CalibrationState>({ phase: 'waiting' })

  // 저장은 샘플을 받은 그 자리에서 한 번만 한다 (effect 안에서 setState 를 부르지 않도록)
  const save = useCallback(
    (baseline: Baseline) => {
      if (saved.current) return
      saved.current = true
      void window.api.settings.saveCalibration(baseline, isRecalibration)
    },
    [isRecalibration]
  )

  useEffect(() => {
    window.api.posture.start()
    return window.api.posture.onSample((sample) => {
      if (!measuring.current) {
        setFace(tracker.current.push(sample))
        return
      }
      const next = collector.current.push(sample)
      setState(next)
      if (next.phase === 'done') save(next.baseline)
    })
  }, [save])

  const start = useCallback(() => {
    collector.current.reset()
    setState({ phase: 'waiting' })
    measuring.current = true
    setArmed(true)
  }, [])

  const retry = useCallback(() => {
    collector.current.reset()
    tracker.current.reset()
    measuring.current = false
    saved.current = false
    setArmed(false)
    setFace('searching')
    setState({ phase: 'waiting' })
  }, [])

  // 설정에서 들어왔으면 설정으로, 온보딩이었으면 리포트로
  const finish = useCallback(() => {
    navigate(isRecalibration ? '/settings' : '/report', { replace: true })
  }, [isRecalibration, navigate])

  const failed = state.phase === 'failed'
  const found = face === 'found'
  const progress = state.phase === 'measuring' ? state.progress : 0

  return (
    <div className="relative h-full w-full bg-grey-100">
      <OnboardingHeader current={found || armed ? 3 : 2} />

      {failed ? (
        <OnboardingPanel title={COPY[state.reason].title} body={COPY[state.reason].body}>
          <Button size="lg" className="w-full" onClick={retry}>
            다시 시도
          </Button>
        </OnboardingPanel>
      ) : found || armed ? (
        <OnboardingPanel title={COPY.ready.title} body={COPY.ready.body}>
          {armed ? (
            <div
              className="h-2 w-full overflow-hidden rounded-pill bg-grey-300"
              role="progressbar"
              aria-valuenow={Math.round(progress * 100)}
            >
              <div
                className="h-full rounded-pill bg-main3 transition-[width] duration-100"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          ) : (
            <Button size="lg" className="w-full" onClick={start}>
              기준 잡기
            </Button>
          )}
        </OnboardingPanel>
      ) : (
        <OnboardingPanel title={COPY.searching.title} body={COPY.searching.body} />
      )}

      {state.phase === 'done' && (
        <Dialog
          title="기준 저장 완료"
          body={'이제 이 자세를 기준으로 살펴볼게요.\n기준은 설정에서 언제든 다시 잡을 수 있어요.'}
          confirmLabel="시작하기"
          onConfirm={finish}
        />
      )}
    </div>
  )
}
