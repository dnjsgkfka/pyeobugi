/** 자세 상태 → 색 매핑. 색 클래스는 Tailwind 가 스캔할 수 있게 리터럴로 둔다. */
export type PostureState = 'good' | 'caution' | 'bad' | 'away' | 'idle'

export interface StateStyle {
  label: string
  /** 면(배경) + 글자 */
  surface: string
  /** 점/막대 같은 단색 마크 */
  mark: string
}

export const STATE_STYLE: Record<PostureState, StateStyle> = {
  good: { label: '바른 자세', surface: 'bg-main4 text-main1', mark: 'bg-main4' },
  caution: { label: '조금 흐트러짐', surface: 'bg-main3 text-main1', mark: 'bg-main3' },
  bad: { label: '자세 무너짐', surface: 'bg-main2 text-main5', mark: 'bg-main2' },
  away: { label: '자리비움', surface: 'bg-grey-200 text-grey-700', mark: 'bg-grey-300' },
  idle: { label: '대기', surface: 'bg-grey-100 text-grey-500', mark: 'bg-grey-200' }
}

/** 시간대별 정자세 비율 막대 색 (Chart Bar: <70 / 70–80 / >80) */
export function barTone(percent: number): string {
  if (percent > 80) return 'bg-main4'
  if (percent >= 70) return 'bg-main3'
  return 'bg-main2'
}
