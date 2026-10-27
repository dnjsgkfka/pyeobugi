import { randomUUID } from 'node:crypto'
import type { AppEvent, EventType } from '@shared/schemas/events'
import { toKstIso } from '@shared/time'

/** 앱 실행 1회 = 1세션. 같은 실행의 모든 이벤트가 같은 sessionId 를 쓴다. */
const sessionId = randomUUID()

export function getSessionId(): string {
  return sessionId
}

type EventOf<T extends EventType> = Extract<AppEvent, { type: T }>

/**
 * 이벤트를 만든다 (eventId 는 생성 시점에 발급 = 중복 방지 키).
 * 주의: USAGE_SEGMENT 는 occurredAt 이 endedAt 과 같아야 하므로 `now` 에 endedAt 을 넘긴다.
 */
export function buildEvent<T extends EventType>(
  type: T,
  payload: EventOf<T>['payload'],
  now: Date = new Date()
): EventOf<T> {
  return {
    eventId: randomUUID(),
    type,
    sessionId,
    occurredAt: toKstIso(now),
    payload
  } as EventOf<T>
}
