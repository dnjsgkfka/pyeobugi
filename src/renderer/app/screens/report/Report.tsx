import { useEffect, useState } from 'react'
import { compareText, durationParts, formatAge, formatRate, peakText } from '@shared/format'
import type { PeriodSummary, ReportSummary } from '@shared/schemas/responses'
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
 * 자세 분포. Swagger 의 distribution(상태별 초) 을 그대로 쓴다.
 * 실서버가 아직 `mildSeconds: null` 을 보내는 경우가 있어 없는 값은 0 으로 본다.
 */
function donutSlices(distribution: NonNullable<ReportSummary['distribution']>): DonutSlice[] {
  return [
    {
      label: '바른 자세',
      seconds: distribution.goodSeconds ?? 0,
      tone: 'bg-main4',
      stroke: '--c-main4'
    },
    {
      label: '주의',
      seconds: distribution.mildSeconds ?? 0,
      tone: 'bg-main3',
      stroke: '--c-main3'
    },
    {
      label: '거북목',
      seconds: distribution.turtleSeconds ?? 0,
      tone: 'bg-main2',
      stroke: '--c-main2'
    }
  ]
}

/** 거북목이 감지된 시각(시 + 분/60). KST ISO 문자열을 그대로 읽는다 */
function badHours(timeline: ReportSummary['turtleNeckTimeline']): number[] {
  if (!timeline) return []
  return timeline.occurredAt
    .map((iso) => {
      const matched = /T(\d{2}):(\d{2})/.exec(iso)
      return matched ? Number(matched[1]) + Number(matched[2]) / 60 : null
    })
    .filter((hour): hour is number => hour !== null)
}

/** 도넛 전체 합. 비율이 아니라 초로 그리므로 세 조각을 더한다 */
function distributionSeconds(distribution: ReportSummary['distribution']): number {
  if (!distribution) return 0
  const { goodSeconds, mildSeconds, turtleSeconds } = distribution
  return (goodSeconds ?? 0) + (mildSeconds ?? 0) + (turtleSeconds ?? 0)
}

/**
 * 이 날짜에 보여 줄 기록이 있는가.
 * hasData 가 기기 전체 기준으로 오는 서버도 있어서(AI 레포 mock), 그 날 사용 시간까지 함께 본다.
 * 그러지 않으면 기록 없는 날에 0% · 0회 · 0분 화면이 떠 버린다.
 */
function hasRecord(data: ReportSummary): boolean {
  return data.hasData && data.day.usageSeconds > 0
}

/** 지표 카드 4개. 순서와 문구는 Figma 그대로. */
function Stats({ data }: { data: ReportSummary }): React.JSX.Element {
  const { day, week } = data
  const previous: PeriodSummary | null = data.yesterday ?? null
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
      {data && !hasRecord(data) && <ReportEmpty />}

      {data && hasRecord(data) && (
        <div className="flex h-[699px] flex-col gap-3">
          <Stats data={data} />
          <div className="flex flex-1 items-stretch gap-3">
            <HourlyChart hourly={data.hourly} />
            <PostureDonut
              slices={data.distribution ? donutSlices(data.distribution) : []}
              totalSeconds={distributionSeconds(data.distribution)}
            />
          </div>
          <BadTimeline
            hours={badHours(data.turtleNeckTimeline)}
            summary={peakText(data.turtleNeckTimeline?.peakHours ?? [])}
          />
        </div>
      )}

      {toast.message && <Toast message={toast.message} onDismiss={toast.dismiss} />}
    </>
  )
}
