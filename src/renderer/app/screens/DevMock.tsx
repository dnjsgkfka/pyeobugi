import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@renderer/ui/Button'

const SCENARIOS = [
  { id: 'ok', label: '정상', note: '지표·차트·도넛이 모두 나와요' },
  { id: 'empty', label: '빈 데이터', note: 'hasData: false — "아직 기록이 없어요"' },
  { id: 'server_error', label: '서버 오류', note: '5xx — 캐시가 없으면 오류 화면' },
  { id: 'offline', label: '네트워크 끊김', note: '응답 없음 — 큐 flush 2초 뒤 조회' },
  { id: 'rate_limited', label: '호출 상한', note: '429 — 캐시가 있으면 stale' },
  { id: 'payload_too_large', label: '본문 초과', note: '413 — 이벤트 전송 쪽만 영향' }
] as const

/** 개발용 화면. mock 시나리오를 앱을 다시 켜지 않고 바꾼다. */
export default function DevMock(): React.JSX.Element {
  const [current, setCurrent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    void window.api.mock.getScenario().then((value) => {
      setCurrent(value)
      setLoading(false)
    })
  }, [])

  if (loading) return <main className="p-10" />

  return (
    <main className="mx-auto flex max-w-150 flex-col gap-6 p-10">
      <h1 className="text-title text-grey-900">mock 시나리오</h1>

      {current === null ? (
        <p className="text-body text-grey-700">
          mock 이 꺼져 있어요. `.env.development` 의 MAIN_VITE_USE_MOCK 을 true 로 두고 다시 켜세요.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {SCENARIOS.map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                onClick={() => void window.api.mock.setScenario(scenario.id).then(setCurrent)}
                className={`flex items-center justify-between rounded-lg p-4 text-left shadow-card ${
                  current === scenario.id ? 'bg-main2 text-main5' : 'bg-white text-grey-900'
                }`}
              >
                <span className="text-body-b">{scenario.label}</span>
                <span
                  className={`text-label ${current === scenario.id ? 'text-main4' : 'text-grey-500'}`}
                >
                  {scenario.note}
                </span>
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Button onClick={() => navigate('/report')}>리포트로 가기</Button>
            <Button variant="secondary" onClick={() => navigate('/dev/detector')}>
              감지 디버그
            </Button>
            <Button variant="secondary" onClick={() => navigate('/dev/gallery')}>
              컴포넌트 갤러리
            </Button>
          </div>

          <p className="text-label text-grey-500">
            오류 화면을 보려면 캐시를 지워야 해요. 캐시가 있으면 stale(지난 기록 + 배지)로 떠요.
          </p>
        </>
      )}
    </main>
  )
}
