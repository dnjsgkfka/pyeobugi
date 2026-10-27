import { useEffect, useRef, useState } from 'react'
import type { DetectorStatus, PostureSample } from '@shared/detector'
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
  const [fps, setFps] = useState(0)
  const counter = useRef({ frames: 0, since: performance.now() })

  useEffect(() => {
    void window.api.posture.getStatus().then(setStatus)
    const offStatus = window.api.posture.onStatus(setStatus)
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
      </div>

      <p className="text-label text-grey-500">
        pitch·size·랜드마크는 기기 안에서만 쓰고 서버로 보내지 않아요.
      </p>
    </main>
  )
}
