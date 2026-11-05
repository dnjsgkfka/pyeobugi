import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { DetectorStatus } from '@shared/detector'
import { Button } from '@renderer/ui/Button'
import { Spinner } from '@renderer/ui/Spinner'
import { OnboardingHeader } from './OnboardingHeader'

interface Copy {
  title: string
  body: string
  confirm: string
  cancel?: string
}

/** 상태별 안내 문구. 허용 전에는 권한을 묻고, 실패하면 무엇이 잘못됐는지 알려준다. */
function copyFor(status: DetectorStatus): Copy {
  switch (status) {
    case 'denied':
      return {
        title: '카메라 권한 없음',
        body: '카메라가 없으면 자세를 감지할 수 없어요.\n시스템 설정에서 펴부기의 카메라 접근을 켜주세요.',
        confirm: '설정 열기'
      }
    case 'no-camera':
      return {
        title: '카메라를 찾을 수 없어요',
        body: '연결된 카메라가 없어요.\n카메라를 연결한 뒤 다시 시도해 주세요.',
        confirm: '다시 시도'
      }
    case 'error':
      return {
        title: '카메라를 열 수 없어요',
        body: '다른 앱이 카메라를 쓰고 있을 수 있어요.\n그 앱을 끄고 다시 시도해 주세요.',
        confirm: '다시 시도'
      }
    default:
      return {
        title: '카메라 권한을 허용하시겠습니까?',
        body: '펴부기가 자세를 감지하려면 카메라가 필요해요.\n카메라 영상은 기기 안에서만 처리돼요.',
        confirm: '허용',
        cancel: '거부'
      }
  }
}

export default function Permission(): React.JSX.Element {
  const [status, setStatus] = useState<DetectorStatus>('idle')
  const navigate = useNavigate()

  useEffect(() => {
    void window.api.posture.getStatus().then(setStatus)
    return window.api.posture.onStatus(setStatus)
  }, [])

  useEffect(() => {
    // 카메라가 열리면 바로 다음 단계로
    if (status === 'running') navigate('/onboarding/calibrate')
  }, [status, navigate])

  const failed = status === 'denied' || status === 'no-camera' || status === 'error'
  const { title, body, confirm, cancel } = copyFor(status)

  function onConfirm(): void {
    if (status === 'denied') window.api.camera.openSettings()
    // 온보딩에서는 카메라만 켠다 (감지 세션은 '자세 감지 시작' 버튼으로만 시작한다)
    else window.api.posture.openCamera()
  }

  function onCancel(): void {
    if (failed) window.api.posture.openCamera()
    else navigate('/onboarding')
  }

  return (
    <div className="relative h-full w-full bg-main1">
      <OnboardingHeader current={1} />

      {/* 카메라 켜는 중: 카드 없이 화면 가운데 스피너 + 문구 (Figma 14:4339) */}
      {status === 'starting' ? (
        <div className="flex h-full items-center justify-center">
          <div className="flex w-[151px] flex-col items-center gap-4">
            <Spinner />
            <h2 className="text-heading text-center text-white">카메라 켜는 중...</h2>
          </div>
        </div>
      ) : (
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col gap-9 rounded-lg bg-white p-6 shadow-card">
            <div className="flex w-102 flex-col gap-4">
              <h2 className="text-heading text-grey-900">{title}</h2>
              <p className="text-body whitespace-pre-line text-grey-700">{body}</p>
            </div>
            <div className="flex w-102 gap-2">
              {cancel && (
                <Button variant="secondary" className="flex-1" onClick={onCancel}>
                  {cancel}
                </Button>
              )}
              <Button className="flex-1" body={!cancel} onClick={onConfirm}>
                {confirm}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
