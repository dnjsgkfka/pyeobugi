import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { CalibrationPhase } from '@shared/detector'
import type { PostureView } from '@shared/ipc'
import { Button } from '@renderer/ui/Button'
import { Dialog } from '@renderer/ui/Dialog'
import { CameraPreview } from './CameraPreview'
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
  }
} as const

export default function Calibrate(): React.JSX.Element {
  const navigate = useNavigate()
  const isRecalibration = useLocation().pathname === '/recalibrate'
  const saved = useRef(false)

  const [face, setFace] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    // 기준을 잡는 동안에는 카메라만 켠다.
    // '자세 감지 시작' 을 누르지 않았으면 경과 시간·사용 구간·이벤트가 쌓이면 안 된다.
    window.api.posture.openCamera()
    const offState = window.api.posture.onState((view: PostureView) => {
      // 얼굴이 보이는지만 본다 (판정은 기준이 있어야 돌아간다)
      setFace(view.feedback.phase !== 'UNAVAILABLE')
    })
    const offCalibration = window.api.posture.onCalibration((phase: CalibrationPhase) => {
      if (phase.phase === 'failed') {
        setFailed(phase.message)
        return
      }
      if (phase.phase !== 'complete' || saved.current) return
      saved.current = true
      setFailed(null)
      void window.api.settings
        .saveCalibration(phase.baseline, isRecalibration)
        .then(() => setDone(true))
    })
    return () => {
      offState()
      offCalibration()
      // 감지 중이었다면 그대로 두고, 기준 잡기 때문에 켠 것이면 끈다
      window.api.posture.closeCameraIfIdle()
    }
  }, [isRecalibration])

  const capture = useCallback(() => {
    saved.current = false
    window.api.posture.calibrate()
  }, [])

  const copy = face ? COPY.ready : COPY.searching

  return (
    <div className="relative h-full w-full">
      <CameraPreview />
      <OnboardingHeader current={face ? 3 : 2} />

      <OnboardingPanel title={copy.title} body={failed ?? copy.body}>
        {face && (
          <Button size="lg" className="w-full" onClick={capture}>
            기준 잡기
          </Button>
        )}
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
