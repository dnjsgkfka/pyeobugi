import { describe, expect, it } from 'vitest'
import { validateEvent } from '@shared/schemas/events'
import { buildEvent, getSessionId } from './events'

describe('buildEvent', () => {
  it('유효한 이벤트를 만들고 같은 실행에서는 sessionId 가 같다', () => {
    const a = buildEvent('SESSION_START', {})
    const b = buildEvent('POSTURE_BAD', { severity: 'MILD' })
    expect(validateEvent(a).ok).toBe(true)
    expect(validateEvent(b).ok).toBe(true)
    expect(a.sessionId).toBe(getSessionId())
    expect(b.sessionId).toBe(a.sessionId)
    expect(a.eventId).not.toBe(b.eventId)
  })
})
