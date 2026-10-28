import { useEffect, useState } from 'react'
import { compareText, durationParts, formatAge, formatRate, peakText } from '@shared/format'
import type { PreviousDay } from '@shared/report'
import type { ReportSummary } from '@shared/schemas/responses'
import { StatCard } from '@renderer/ui/StatCard'
import { Toast } from '@renderer/ui/Toast'
import { useToast } from '@renderer/ui/useToast'
import { BadTimeline } from './BadTimeline'
import { DatePicker } from './DatePicker'
import { HourlyChart } from './HourlyChart'
import { PostureDonut, type DonutSlice } from './PostureDonut'
import { ReportEmpty, ReportError, ReportLoading } from './ReportStates'
import { useReport } from './useReport'
import { kstDateString } from '@shared/time'

/**
 * 자세 분포.
 * TODO(BE): 상태별 시간이 응답에 없어서 유지율로 바른 자세/나쁜 자세만 나눈다.
 * 세 구간(바른 자세 / 주의 / 거북목)으로 보여주려면 필드가 필요하다.
 */
function donutSlices(day: ReportSummary['day']): DonutSlice[] {
  const rate = day.postureKeepRate ?? 0
  const good = Math.round((day.usageSeconds * rate) / 100)
  return [
    { label: '바른 자세', seconds: good, tone: 'bg-main4', stroke: '--c-main4' },
    { label: '거북목', seconds: day.usageSeconds - good, tone: 'bg-main2', stroke: '--c-main2' }
  ]
}

/**
 * 거북목이 감지된 시각.
 * TODO(BE): 감지 시각 목록이 응답에 없다. 지금은 정자세 비율이 낮았던 시간으로 대신한다.
 */
function badHours(hourly: ReportSummary['hourly']): number[] {
  return hourly
    .filter((entry) => entry.postureKeepRate !== null && entry.postureKeepRate < 70)
    .map((entry) => entry.hour)
}

/** 지표 카드 4개. 순서와 문구는 Figma 그대로. */
function Stats({
  data,
  previous
}: {
  data: ReportSummary
  previous: PreviousDay
}): React.JSX.Element {
  const { day, week } = data
  const minutes = Math.round(day.usageSeconds / 60)
  const previousMinutes = previous ? Math.round(previous.usageSeconds / 60) : null

  return (
    <div className="flex items-center gap-3">
      <StatCard
        title="정자세 유지율"
        parts={[{ value: formatRate(day.postureKeepRate), unit: '%' }]}
        note={
          compareText(
            day.postureKeepRate,
            previous?.postureKeepRate,
            '%p',
            '올랐어요',
            '줄었어요'
          ) ?? '어제 기록이 없어요'
        }
      />
      <StatCard
        title="거북목 횟수"
        parts={[{ value: String(day.turtleNeckCount), unit: '회' }]}
        note={
          compareText(
            day.turtleNeckCount,
            previous?.turtleNeckCount,
            '회',
            '늘었어요',
            '줄었어요'
          ) ?? '어제 기록이 없어요'
        }
      />
      <StatCard
        title="뽀모도로 완료"
        parts={[{ value: String(day.pomodoroCount), unit: '개' }]}
        note={`이번 주 누적 ${week.pomodoroCount}개`}
      />
      <StatCard
        title="총 사용 시간"
        parts={durationParts(day.usageSeconds)}
        note={
          compareText(minutes, previousMinutes, '분', '늘었어요', '줄었어요') ??
          '어제 기록이 없어요'
        }
      />
    </div>
  )
}

export default function Report(): React.JSX.Element {
  const [date, setDate] = useState(() => kstDateString(new Date()))
  const [recorded, setRecorded] = useState<Set<string>>(new Set())
  const { state, reload, reloading } = useReport(date)
  const toast = useToast()
  const view = state.status === 'ready' ? state.view : null
  const { show } = toast

  useEffect(() => {
    // 토스트는 조회 실패에만 띄운다. 이벤트 전송 실패에는 띄우지 않는다.
    if (view?.kind === 'stale') show('기록을 새로 불러오지 못했어요')
  }, [view, show])

  // 조회가 끝날 때마다 캘린더 표시용 날짜를 다시 받는다
  useEffect(() => {
    if (state.status !== 'ready') return
    void window.api.report.recordedDates().then((dates) => setRecorded(new Set(dates)))
  }, [state])

  const data = view && view.kind !== 'error' ? view.data : null
  const previous = view && view.kind !== 'error' ? view.previous : null

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-title text-grey-900">자세 리포트</h1>
        <div className="flex items-center gap-3">
          {view?.kind === 'stale' && (
            <span className="text-label rounded-pill bg-grey-200 px-3 py-1 text-grey-700">
              {formatAge(view.cachedAt)} 기록
            </span>
          )}
          <DatePicker value={date} recorded={recorded} onChange={setDate} />
        </div>
      </div>

      {state.status === 'loading' && <ReportLoading />}
      {view?.kind === 'error' && (
        <ReportError reason={view.reason} onRetry={reload} busy={reloading} />
      )}
      {data && !data.hasData && <ReportEmpty />}

      {data?.hasData && (
        <div className="flex h-[699px] flex-col gap-3">
          <Stats data={data} previous={previous} />
          <div className="flex flex-1 items-stretch gap-3">
            <HourlyChart hourly={data.hourly} />
            <PostureDonut slices={donutSlices(data.day)} totalSeconds={data.day.usageSeconds} />
          </div>
          <BadTimeline hours={badHours(data.hourly)} summary={peakText(badHours(data.hourly))} />
        </div>
      )}

      {toast.message && <Toast message={toast.message} onDismiss={toast.dismiss} />}
    </>
  )
}
