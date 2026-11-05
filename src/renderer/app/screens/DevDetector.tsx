import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { DetectorStatus, PostureSample } from '@shared/detector'
import type { PostureView } from '@shared/ipc'
import { Button } from '@renderer/ui/Button'

const STATUS_TEXT: Record<DetectorStatus, string> = {
  idle: '대기 중',
  starting: '카메라 여는 중…',
  running: '감지 중',
  denied: '카메라 권한이 거부됐어요',
  'no-camera': '카메라를 찾을 수 없어요',
  error: '카메라를 열 수 없어요. 다른 앱이 쓰는 중이거나 설정에서 막혀 있을 수 있어요'
}

function Row({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="flex items-baseline justify-between border-b border-grey-200 py-3">
      <span className="text-label text-grey-700">{label}</span>
      <span className="text-heading tabular-nums text-grey-900">{value}</span>
    </div>
  )
}

export default function DevDetector(): React.JSX.Element {
  const [status, setStatus] = useState<DetectorStatus>('idle')
  const [sample, setSample] = useState<PostureSample | null>(null)
  const [posture, setPosture] = useState<PostureView | null>(null)
  const [fps, setFps] = useState(0)
  // 렌더 중에는 performance.now() 를 부르지 않는다 (react-hooks/purity) → useEffect 에서 채운다
  const counter = useRef({ frames: 0, since: 0 })
  const navigate = useNavigate()

  useEffect(() => {
    counter.current.since = performance.now()
    void window.api.posture.getStatus().then(setStatus)
    const offStatus = window.api.posture.onStatus(setStatus)
    const offState = window.api.posture.onState(setPosture)
    const offSample = window.api.posture.onSample((next) => {
      setSample(next)
      const c = counter.current
      c.frames++
      const elapsed = performance.now() - c.since
      if (elapsed >= 1000) {
        setFps(Math.round((c.frames * 1000) / elapsed))
        c.frames = 0
        c.since = performance.now()
      }
    })
    return () => {
      offStatus()
      offState()
      offSample()
    }
  }, [])

  const running = status === 'running' || status === 'starting'

  return (
    <main className="mx-auto flex max-w-150 flex-col gap-6 p-10">
      <h1 className="text-title text-grey-900">자세 감지 디버그</h1>

      <div className="flex flex-col gap-4 rounded-lg bg-white p-6 shadow-card">
        <div className="flex items-center justify-between">
          <span className="text-body text-grey-700">{STATUS_TEXT[status]}</span>
          <Button
            variant={running ? 'secondary' : 'primary'}
            onClick={() => (running ? window.api.posture.stop() : window.api.posture.start())}
          >
            {running ? '정지' : '감지 시작'}
          </Button>
        </div>
        {(status === 'denied' || status === 'error') && (
          <Button variant="secondary" onClick={() => window.api.camera.openSettings()}>
            카메라 설정 열기
          </Button>
        )}
      </div>

      <div className="flex flex-col rounded-lg bg-white px-6 py-2 shadow-card">
        <Row label="face" value={sample ? String(sample.face) : '-'} />
        <Row
          label="pitch (고개 숙이면 +)"
          value={sample?.pitch != null ? `${sample.pitch.toFixed(1)}°` : '-'}
        />
        <Row
          label="size (가까우면 +)"
          value={sample?.size != null ? sample.size.toFixed(3) : '-'}
        />
        <Row label="fps" value={String(fps)} />
        <Row label="판정" value={posture?.feedback.phase ?? '-'} />
        <Row
          label="점수"
          value={posture?.feedback.score != null ? posture.feedback.score.toFixed(1) : '-'}
        />
        <Row label="severity" value={posture?.feedback.severity ?? '-'} />
        <Row
          label="거북목 지속"
          value={
            posture && posture.feedback.badDurationMs > 0
              ? `${(posture.feedback.badDurationMs / 1000).toFixed(1)}초`
              : '-'
          }
        />
        <Row
          label="마지막 종료"
          value={posture?.feedback.lastExit ? posture.feedback.lastExit.reason : '-'}
        />
        <Row
          label="거리 변화 안내"
          value={
            posture?.distance.suggested ? `권유 (${posture.distance.direction ?? '-'})` : '아니요'
          }
        />
        <Row label="추론 간격" value={sample ? `${fps} 회/초` : '-'} />
      </div>

      <div className="flex gap-2">
        <Button onClick={() => navigate('/report')}>리포트로 가기</Button>
        <Button variant="secondary" onClick={() => navigate('/dev/mock')}>
          mock 시나리오
        </Button>
      </div>

      <p className="text-label text-grey-500">
        pitch·size·랜드마크는 기기 안에서만 쓰고 서버로 보내지 않아요.
      </p>
    </main>
  )
}
