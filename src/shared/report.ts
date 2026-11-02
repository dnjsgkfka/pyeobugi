import type { ReportSummary } from './schemas/responses'

/** 리포트 조회 결과. 화면은 이 세 가지 상태만 그린다. */
export type ReportView =
  | { kind: 'ok'; data: ReportSummary }
  /** 조회에 실패했지만 마지막으로 받아 둔 값이 있다 */
  | { kind: 'stale'; data: ReportSummary; cachedAt: string; reason: string }
  | { kind: 'error'; reason: string }
