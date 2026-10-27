import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { DetectorStatus } from '@shared/detector'
import { Button } from '@renderer/ui/Button'
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
        title: '카메라를 쓸 수 없어요',
        body: '카메라 권한이 거부되어 있어요.\n설정에서 허용한 뒤 다시 시도해 주세요.',
        confirm: '카메라 설정 열기',
        cancel: '다시 시도'
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
    case 'starting':
      return { title: '카메라를 여는 중이에요', body: '잠시만 기다려 주세요.', confirm: '연결 중…' }
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
    else window.api.posture.start()
  }

  function onCancel(): void {
    if (failed) window.api.posture.start()
    else navigate('/onboarding')
  }

  return (
    <div className="relative h-full w-full bg-main1">
      <OnboardingHeader current={1} />
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
            <Button className="flex-1" disabled={status === 'starting'} onClick={onConfirm}>
              {confirm}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
