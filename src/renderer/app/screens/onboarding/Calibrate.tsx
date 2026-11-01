import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CalibrationCollector, type Baseline, type CalibrationState } from '@shared/calibration'
import { Button } from '@renderer/ui/Button'
import { Spinner } from '@renderer/ui/Spinner'
import { OnboardingHeader } from './OnboardingHeader'

const COPY = {
  waiting: {
    title: '얼굴을 찾고 있어요',
    body: '화면 가운데에 얼굴이 보이도록 앉아 주세요.'
  },
  measuring: {
    title: '기준 자세를 재고 있어요',
    body: '평소에 바르게 앉는 자세로 3초만 있어 주세요.'
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
  const saved = useRef(false)
  const [state, setState] = useState<CalibrationState>({ phase: 'waiting' })

  // 저장은 샘플을 받은 그 자리에서 한 번만 한다 (effect 안에서 setState 를 부르지 않도록)
  const save = useCallback(
    (baseline: Baseline) => {
      if (saved.current) return
      saved.current = true
      void window.api.settings
        .saveCalibration(baseline, isRecalibration)
        // 설정에서 들어왔으면 설정으로, 온보딩이었으면 리포트로
        .then(() => navigate(isRecalibration ? '/settings' : '/report', { replace: true }))
    },
    [isRecalibration, navigate]
  )

  useEffect(() => {
    window.api.posture.start()
    return window.api.posture.onSample((sample) => {
      const next = collector.current.push(sample)
      setState(next)
      if (next.phase === 'done') save(next.baseline)
    })
  }, [save])

  const retry = useCallback(() => {
    collector.current.reset()
    setState({ phase: 'waiting' })
  }, [])

  const failed = state.phase === 'failed'
  const copy = failed
    ? COPY[state.reason]
    : state.phase === 'measuring'
      ? COPY.measuring
      : COPY.waiting
  const progress = state.phase === 'measuring' ? state.progress : state.phase === 'done' ? 1 : 0

  return (
    <div className="relative h-full w-full bg-main1">
      <OnboardingHeader current={failed || state.phase === 'waiting' ? 2 : 3} />
      <div className="flex h-full items-center justify-center">
        <div className="flex w-150 flex-col items-center gap-9 rounded-lg bg-white p-10 shadow-card">
          <div className="flex flex-col items-center gap-4 text-center">
            <h2 className="text-heading text-grey-900">{copy.title}</h2>
            <p className="text-body whitespace-pre-line text-grey-700">{copy.body}</p>
          </div>

          {!failed &&
            (state.phase === 'measuring' ? (
              <div
                className="h-2 w-80 overflow-hidden rounded-pill bg-grey-300"
                role="progressbar"
                aria-valuenow={Math.round(progress * 100)}
              >
                <div
                  className="h-full rounded-pill bg-main3 transition-[width] duration-100"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            ) : (
              <Spinner />
            ))}

          {failed && <Button onClick={retry}>다시 시도</Button>}
        </div>
      </div>
    </div>
  )
}
