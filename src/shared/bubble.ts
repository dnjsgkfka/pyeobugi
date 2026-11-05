import { BUBBLE_TYPES } from './schemas/events'

/** 서버로 보내는 말풍선 종류 (BUBBLE_SHOWN 의 bubbleType) */
export type BubbleType = (typeof BUBBLE_TYPES)[number]

/**
 * 화면에 뜨는 말풍선 종류.
 * `distance`(기준 다시 잡기 권유)는 전용 이벤트 타입이 없어서 POSTURE 로 집계한다.
 * TODO(BE): 따로 세려면 BUBBLE_TYPES 에 전용 타입 추가 요청.
 */
export type BubbleKind =
  'posture' | 'distance' | 'timer-break' | 'encourage' | 'greeting' | 'stretch'

export interface Bubble {
  kind: BubbleKind
  /** 적재할 이벤트 종류 */
  event: BubbleType
  message: string
  /** 누르면 기준 다시 잡기로 보낸다 */
  action?: 'recalibrate'
}

/** 겹칠 때 위에 있는 것만 보여 준다 */
const PRIORITY: BubbleKind[] = [
  'posture',
  'timer-break',
  'encourage',
  'distance',
  'greeting',
  'stretch'
]

const BUBBLES: Record<BubbleKind, Bubble> = {
  posture: { kind: 'posture', event: 'POSTURE', message: '목이 앞으로 나왔어요' },
  // TODO(PM/디자인): 문구와 동작(눌러서 재설정) 확인 필요
  distance: {
    kind: 'distance',
    event: 'POSTURE',
    message: '기준을 다시 잡아볼까요?',
    action: 'recalibrate'
  },
  'timer-break': { kind: 'timer-break', event: 'TIMER_BREAK', message: '휴식 시간이에요' },
  // TODO(PM): 복구 보상 문구 확인 필요
  encourage: { kind: 'encourage', event: 'ENCOURAGE', message: '좋아요, 자세가 돌아왔어요' },
  greeting: { kind: 'greeting', event: 'GREETING', message: '오늘도 같이 바르게 앉아요' },
  stretch: { kind: 'stretch', event: 'STRETCH', message: '잠깐 목을 펴 볼까요?' }
}

/** 한 번 띄우면 이만큼 보여 준다 (자세·거리처럼 조건이 이어지는 것은 조건이 끝날 때까지) */
export const SHOW_MS = 6_000
/** 말풍선 사이 최소 간격 — 연달아 쏟아지지 않게 */
export const MIN_GAP_MS = 5_000
/** 같은 종류를 다시 띄우기까지 */
export const COOLDOWN_MS: Record<BubbleKind, number> = {
  posture: 0,
  distance: 0,
  'timer-break': 60_000,
  encourage: 30_000,
  greeting: 10 * 60_000,
  stretch: 20 * 60_000
}
/** 스트레칭 안내 간격 (설정에서 켜 둔 경우) */
export const STRETCH_EVERY_MS = 30 * 60_000

/** 지금 이어지고 있는 조건 */
export interface BubbleConditions {
  /** 거북목으로 확정된 상태 */
  posture: boolean
  /** 기준 다시 잡기 권유 */
  distance: boolean
}

/**
 * 말풍선을 고른다.
 *
 * - 조건이 이어지는 것(자세·거리)은 조건이 참인 동안 떠 있는다
 * - 한 번뿐인 것(보상·휴식·인사·스트레칭)은 `trigger` 로 넣고 SHOW_MS 동안 떠 있는다
 * - 겹치면 우선순위 하나만, 같은 종류는 쿨다운만큼 쉬고, 말풍선 사이에는 최소 간격을 둔다
 */
export class BubblePicker {
  private shownAt = new Map<BubbleKind, number>()
  /** 직전 말풍선이 끝난 시각. 아직 아무것도 안 띄웠으면 간격을 따지지 않는다 */
  private lastEndedAt = Number.NEGATIVE_INFINITY
  private pending: BubbleKind[] = []
  private current: { kind: BubbleKind; until: number } | null = null

  /** 한 번뿐인 말풍선을 예약한다 */
  trigger(kind: BubbleKind, now: number): void {
    const last = this.shownAt.get(kind)
    if (last !== undefined && now - last < COOLDOWN_MS[kind]) return
    if (!this.pending.includes(kind)) this.pending.push(kind)
  }

  /** 지금 보여 줄 말풍선. 없으면 null */
  update(now: number, conditions: BubbleConditions): Bubble | null {
    const holding: BubbleKind[] = []
    if (conditions.posture) holding.push('posture')
    if (conditions.distance) holding.push('distance')

    // 떠 있는 것이 아직 유효한지 본다
    if (this.current) {
      const { kind, until } = this.current
      const alive = COOLDOWN_MS[kind] === 0 ? holding.includes(kind) : now < until
      if (!alive) {
        // 제 수명을 다했다 → 다음 말풍선까지 최소 간격을 둔다
        this.current = null
        this.lastEndedAt = now
        return null
      }
      // 더 급한 것이 생기면 간격 없이 바로 바꿔 준다
      const urgent = [...holding, ...this.pending].some(
        (next) => PRIORITY.indexOf(next) < PRIORITY.indexOf(kind)
      )
      if (!urgent) return BUBBLES[kind]
      this.current = null
    }

    if (now - this.lastEndedAt < MIN_GAP_MS) return null

    const candidates = [...holding, ...this.pending].sort(
      (a, b) => PRIORITY.indexOf(a) - PRIORITY.indexOf(b)
    )
    for (const kind of candidates) {
      const last = this.shownAt.get(kind)
      if (last !== undefined && now - last < COOLDOWN_MS[kind]) continue
      this.pending = this.pending.filter((pending) => pending !== kind)
      this.shownAt.set(kind, now)
      this.current = { kind, until: now + SHOW_MS }
      return BUBBLES[kind]
    }
    return null
  }

  /** 오버레이를 끄거나 감지를 멈출 때 */
  reset(): void {
    this.pending = []
    this.current = null
  }
}
