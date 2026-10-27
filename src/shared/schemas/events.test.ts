import { describe, expect, it } from 'vitest'
import { makeEvent } from '../testing'
import { EventsRequestSchema, validateEvent, type EventType } from './events'

const NOW = new Date('2026-10-04T14:05:00+09:00')
const ALL: EventType[] = [
  'SESSION_START',
  'SESSION_END',
  'USAGE_SEGMENT',
  'POSTURE_BAD',
  'POMODORO_COMPLETED',
  'CALIBRATION_COMPLETED',
  'BUBBLE_SHOWN',
  'SETTINGS_CHANGED'
]

function code(input: unknown): string {
  const r = validateEvent(input, NOW)
  return r.ok ? 'OK' : r.code
}

describe('이벤트 스키마', () => {
  it.each(ALL)('%s 는 유효하다', (type) => {
    expect(code(makeEvent(type, NOW))).toBe('OK')
  })

  describe('금지 필드 거부', () => {
    it('payload 에 pitch 가 있으면 FORBIDDEN_FIELD', () => {
      const e = makeEvent('POSTURE_BAD', NOW)
      expect(code({ ...e, payload: { ...e.payload, pitch: 12.3 } })).toBe('FORBIDDEN_FIELD')
    })

    it('이벤트 최상위에 faceImage 가 있으면 FORBIDDEN_FIELD', () => {
      expect(code({ ...makeEvent('SESSION_START', NOW), faceImage: 'data:...' })).toBe(
        'FORBIDDEN_FIELD'
      )
    })

    it('SESSION 이벤트 payload 에 개인 기준값이 있으면 FORBIDDEN_FIELD', () => {
      const e = makeEvent('CALIBRATION_COMPLETED', NOW)
      expect(code({ ...e, payload: { ...e.payload, baseline: { pitch: 1 } } })).toBe(
        'FORBIDDEN_FIELD'
      )
    })

    it('SETTINGS_CHANGED 에 슬라이더 값을 넣으면 FORBIDDEN_FIELD', () => {
      const e = makeEvent('SETTINGS_CHANGED', NOW)
      expect(code({ ...e, payload: { ...e.payload, sensitivity: 2 } })).toBe('FORBIDDEN_FIELD')
    })

    it('금지 필드와 다른 오류가 같이 있어도 FORBIDDEN_FIELD 가 우선', () => {
      const e = makeEvent('POSTURE_BAD', NOW)
      expect(code({ ...e, payload: { severity: 'NOPE', landmarks: [] } })).toBe('FORBIDDEN_FIELD')
    })

    it('요청 body 최상위에 정의되지 않은 필드가 있으면 거부', () => {
      const ok = EventsRequestSchema.safeParse({ events: [makeEvent('SESSION_START', NOW)] })
      const bad = EventsRequestSchema.safeParse({
        events: [makeEvent('SESSION_START', NOW)],
        extra: 1
      })
      expect(ok.success).toBe(true)
      expect(bad.success).toBe(false)
    })
  })

  describe('그 밖의 거부 사유', () => {
    it('모르는 type 은 UNKNOWN_TYPE', () => {
      expect(code({ ...makeEvent('SESSION_START', NOW), type: 'BUBBLE_REACTED' })).toBe(
        'UNKNOWN_TYPE'
      )
    })

    it('eventId 가 UUID v4 가 아니면 INVALID_PAYLOAD', () => {
      expect(code({ ...makeEvent('SESSION_START', NOW), eventId: 'abc' })).toBe('INVALID_PAYLOAD')
    })

    it('severity 값이 목록에 없으면 INVALID_PAYLOAD', () => {
      const e = makeEvent('POSTURE_BAD', NOW)
      expect(code({ ...e, payload: { severity: 'HUGE' } })).toBe('INVALID_PAYLOAD')
    })

    it('KST 가 아닌 시각은 INVALID_PAYLOAD', () => {
      expect(code({ ...makeEvent('SESSION_START', NOW), occurredAt: '2026-10-04T05:05:00Z' })).toBe(
        'INVALID_PAYLOAD'
      )
    })

    it('미래 5분 초과 / 과거 30일 초과는 OCCURRED_AT_OUT_OF_RANGE', () => {
      const future = { ...makeEvent('SESSION_START', NOW), occurredAt: '2026-10-04T14:11:00+09:00' }
      const past = { ...makeEvent('SESSION_START', NOW), occurredAt: '2026-09-03T14:04:00+09:00' }
      const okFuture = {
        ...makeEvent('SESSION_START', NOW),
        occurredAt: '2026-10-04T14:09:00+09:00'
      }
      expect(code(future)).toBe('OCCURRED_AT_OUT_OF_RANGE')
      expect(code(past)).toBe('OCCURRED_AT_OUT_OF_RANGE')
      expect(code(okFuture)).toBe('OK')
    })

    it('객체가 아니면 INVALID_PAYLOAD', () => {
      expect(code(null)).toBe('INVALID_PAYLOAD')
      expect(code('x')).toBe('INVALID_PAYLOAD')
    })
  })

  describe('USAGE_SEGMENT 규칙', () => {
    const seg = (payload: Record<string, unknown>, occurredAt = payload.endedAt): unknown => ({
      ...makeEvent('USAGE_SEGMENT', NOW),
      occurredAt,
      payload
    })
    const valid = {
      startedAt: '2026-10-04T14:04:00+09:00',
      endedAt: '2026-10-04T14:05:00+09:00',
      durationSec: 60,
      badDurationSec: 12
    }

    it('정상 구간', () => expect(code(seg(valid))).toBe('OK'))

    it('badDurationSec > durationSec 이면 거부', () => {
      expect(code(seg({ ...valid, badDurationSec: 61 }))).toBe('INVALID_PAYLOAD')
    })

    it('durationSec 가 3600 을 넘으면 거부', () => {
      expect(code(seg({ ...valid, durationSec: 3601 }))).toBe('INVALID_PAYLOAD')
    })

    it('startedAt >= endedAt 이면 거부', () => {
      expect(
        code(seg({ ...valid, startedAt: valid.endedAt, durationSec: 0, badDurationSec: 0 }))
      ).toBe('INVALID_PAYLOAD')
    })

    it('durationSec 가 시각 차이와 1초 넘게 다르면 거부', () => {
      expect(code(seg({ ...valid, durationSec: 62 }))).toBe('INVALID_PAYLOAD')
      expect(code(seg({ ...valid, durationSec: 61 }))).toBe('OK')
    })

    it('occurredAt 이 endedAt 과 다르면 거부', () => {
      expect(code(seg(valid, '2026-10-04T14:05:30+09:00'))).toBe('INVALID_PAYLOAD')
    })

    it('KST 날짜 경계를 넘으면 거부, 다음 날 00:00 종료는 허용', () => {
      const cross = {
        startedAt: '2026-10-03T23:59:30+09:00',
        endedAt: '2026-10-04T00:00:30+09:00',
        durationSec: 60,
        badDurationSec: 0
      }
      const toMidnight = {
        startedAt: '2026-10-03T23:59:00+09:00',
        endedAt: '2026-10-04T00:00:00+09:00',
        durationSec: 60,
        badDurationSec: 0
      }
      expect(code(seg(cross))).toBe('INVALID_PAYLOAD')
      expect(code(seg(toMidnight))).toBe('OK')
    })
  })
})
