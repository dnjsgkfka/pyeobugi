import type { ReportSummary } from './schemas/responses'

/** 어제와 비교하려고 함께 받아 둔 지표. 못 받으면 null */
export type PreviousDay = ReportSummary['day'] | null

/** 리포트 조회 결과. 화면은 이 네 가지 상태만 그린다. */
export type ReportView =
  | { kind: 'ok'; data: ReportSummary; previous: PreviousDay }
  /** 조회에 실패했지만 마지막으로 받아 둔 값이 있다 */
  | { kind: 'stale'; data: ReportSummary; previous: PreviousDay; cachedAt: string; reason: string }
  | { kind: 'error'; reason: string }
