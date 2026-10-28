import characterError from '@renderer/assets/character/character_1.svg'
import characterEmpty from '@renderer/assets/character/character_3.svg'
import { Button } from '@renderer/ui/Button'
import { Spinner } from '@renderer/ui/Spinner'
import { IconRefresh } from '@renderer/ui/icons'

/** 로딩·빈 데이터·오류가 공통으로 쓰는 흰 카드 (높이 699, 가운데 정렬, gap 24) */
function Panel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex h-[699px] flex-col items-center justify-center gap-6 rounded-lg bg-white p-4 shadow-card">
      {children}
    </div>
  )
}

export function ReportLoading(): React.JSX.Element {
  return (
    <Panel>
      <div className="flex flex-col items-center gap-4">
        <Spinner />
        <span className="text-heading text-grey-900">기록을 불러오는 중...</span>
      </div>
    </Panel>
  )
}

export function ReportEmpty(): React.JSX.Element {
  return (
    <Panel>
      <img src={characterEmpty} alt="" width={300} height={300} />
      <div className="flex flex-col items-center gap-2">
        <span className="text-heading text-grey-900">아직 기록이 없어요</span>
        <span className="text-body text-grey-500">
          자세 감지를 시작하고, 펴부기와 함께 기록을 쌓아가봐요!
        </span>
      </div>
    </Panel>
  )
}

/** 조회 실패. 그림은 같고, 네트워크가 끊긴 경우에만 안내 문구가 다르다. */
export function ReportError({
  reason,
  onRetry,
  busy
}: {
  reason: string
  onRetry: () => void
  busy: boolean
}): React.JSX.Element {
  const offline = reason === 'offline'

  return (
    <Panel>
      {/* 와이파이 표시까지 포함된 그림 (300 + 4 + 100) */}
      <img src={characterError} alt="" width={300} height={404} />
      <div className="flex flex-col items-center gap-2">
        <span className="text-heading text-grey-900">기록을 불러올 수 없어요</span>
        <span className="text-body whitespace-pre-line text-center text-grey-500">
          {offline
            ? '인터넷 연결을 확인한 뒤 다시 시도해 주세요.\n그동안의 자세 기록은 기기에 저장해 두었다가 연결되면 자동으로 동기화해요.'
            : '잠시 뒤에 다시 시도해 주세요.\n그동안의 자세 기록은 기기에 저장해 두었다가 연결되면 자동으로 동기화해요.'}
        </span>
      </div>
      <Button icon={<IconRefresh />} disabled={busy} onClick={onRetry}>
        다시 시도
      </Button>
    </Panel>
  )
}
