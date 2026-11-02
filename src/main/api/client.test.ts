import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { makeEvent } from '@shared/testing'
import { createApiClient, type ApiClient } from './client'
import { resetMock, setScenario } from '../mock/handlers'
import type { Scenario } from '../mock/scenarios'
import { server } from '../mock/server'

const DEVICE_ID = '3f2b8c1e-6a4d-4e0b-9b7a-0c1d2e3f4a5b'
const BASE = 'https://mock.turtle.local/api'

function client(deviceId = DEVICE_ID): ApiClient {
  return createApiClient({ baseUrl: BASE, deviceId, onError: () => {} })
}
function use(scenario: Scenario): void {
  setScenario(scenario)
}

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => resetMock())
afterAll(() => server.close())

describe('이벤트 전송', () => {
  it('ok: 보낸 이벤트는 accepted', async () => {
    const events = [makeEvent('SESSION_START'), makeEvent('USAGE_SEGMENT')]
    expect(await client().postEvents(events)).toEqual({
      kind: 'done',
      accepted: 2,
      duplicated: 0,
      rejected: []
    })
  })

  it('같은 eventId 를 다시 보내면 duplicated', async () => {
    const e = makeEvent('POSTURE_BAD')
    await client().postEvents([e])
    const again = await client().postEvents([e])
    expect(again).toMatchObject({ kind: 'done', accepted: 0, duplicated: 1 })
  })

  it('같은 eventId 에 내용이 달라도 덮어쓰지 않고 duplicated', async () => {
    const e = makeEvent('POSTURE_BAD')
    await client().postEvents([e])
    const changed = { ...e, payload: { severity: 'SEVERE' as const } }
    expect(await client().postEvents([changed as never])).toMatchObject({ duplicated: 1 })
  })

  it('기기가 다르면 같은 eventId 도 새 이벤트', async () => {
    const e = makeEvent('POSTURE_BAD')
    await client().postEvents([e])
    const other = client('11111111-1111-4111-8111-111111111111')
    expect(await other.postEvents([e])).toMatchObject({ accepted: 1, duplicated: 0 })
  })

  it('금지 필드가 섞인 이벤트는 그것만 rejected, 나머지는 accepted', async () => {
    const good = makeEvent('SESSION_START')
    const bad = { ...makeEvent('POSTURE_BAD'), payload: { severity: 'MILD', pitch: 3 } }
    const result = await client().postEvents([good, bad] as never)
    expect(result).toMatchObject({ kind: 'done', accepted: 1, duplicated: 0 })
    if (result.kind === 'done') {
      expect(result.rejected).toEqual([{ index: 1, eventId: bad.eventId, code: 'FORBIDDEN_FIELD' }])
    }
  })

  it('accepted + duplicated + rejected 는 요청 개수와 같다', async () => {
    const dup = makeEvent('SESSION_END')
    await client().postEvents([dup])
    const batch = [dup, makeEvent('SESSION_START'), { type: 'NOPE' }] as never
    const r = await client().postEvents(batch)
    if (r.kind !== 'done') throw new Error('done 이 아님')
    expect(r.accepted + r.duplicated + r.rejected.length).toBe(3)
  })

  it('empty 시나리오에서도 이벤트 전송은 정상', async () => {
    use('empty')
    expect(await client().postEvents([makeEvent('SESSION_START')])).toMatchObject({ kind: 'done' })
  })

  it('429 → retry(rate_limited) + retryAfterSec', async () => {
    use('rate_limited')
    expect(await client().postEvents([makeEvent('SESSION_START')])).toEqual({
      kind: 'retry',
      reason: 'rate_limited',
      retryAfterSec: 3
    })
  })

  it('5xx → retry(server_error)', async () => {
    use('server_error')
    expect(await client().postEvents([makeEvent('SESSION_START')])).toEqual({
      kind: 'retry',
      reason: 'server_error'
    })
  })

  it('네트워크 단절 → retry(offline)', async () => {
    use('offline')
    expect(await client().postEvents([makeEvent('SESSION_START')])).toEqual({
      kind: 'retry',
      reason: 'offline'
    })
  })

  it('413 → 이벤트가 2개 이상이면 split', async () => {
    use('payload_too_large')
    const events = [makeEvent('SESSION_START'), makeEvent('SESSION_END')]
    expect(await client().postEvents(events)).toEqual({ kind: 'split' })
  })

  it('413 → 이벤트 1개면 쪼갤 수 없으니 discard', async () => {
    use('payload_too_large')
    expect(await client().postEvents([makeEvent('SESSION_START')])).toMatchObject({
      kind: 'discard',
      reason: 'payload_too_large'
    })
  })

  it('기기 ID 형식이 틀리면 discard(device_id_invalid)', async () => {
    const r = await client('not-a-uuid').postEvents([makeEvent('SESSION_START')])
    expect(r).toMatchObject({ kind: 'discard', reason: 'device_id_invalid' })
  })

  it('이벤트 목록이 비어 있으면 400 → discard(invalid_request)', async () => {
    expect(await client().postEvents([])).toMatchObject({
      kind: 'discard',
      reason: 'invalid_request'
    })
  })

  it('실제 크기 초과(101개)도 413 → split', async () => {
    const events = Array.from({ length: 101 }, () => makeEvent('SESSION_START'))
    expect(await client().postEvents(events)).toEqual({ kind: 'split' })
  })
})

describe('리포트 조회', () => {
  it('ok: 요약과 시간대별 24칸을 받는다', async () => {
    const r = await client().getReportSummary('2026-10-04')
    if (r.kind !== 'ok') throw new Error('ok 가 아님')
    expect(r.data).toMatchObject({ hasData: true, date: '2026-10-04' })
    expect(r.data.hourly).toHaveLength(24)
    expect(r.data.day.postureKeepRate).toBe(82)
  })

  it('Swagger 의 yesterday / distribution / turtleNeckTimeline 을 받는다', async () => {
    const r = await client().getReportSummary('2026-10-04')
    if (r.kind !== 'ok') throw new Error('ok 가 아님')
    expect(r.data.yesterday?.postureKeepRate).toBe(76)
    expect(r.data.lastWeek?.postureKeepRate).toBe(74)
    expect(r.data.distribution).toMatchObject({ goodSeconds: 10332, turtleSeconds: 756 })
    expect(r.data.turtleNeckTimeline?.peakHours).toEqual([14, 18])
    expect(r.data.turtleNeckTimeline?.occurredAt).toHaveLength(5)
  })

  it('date 를 생략하면 오늘 날짜로 내려온다', async () => {
    const r = await client().getReportSummary()
    expect(r.kind).toBe('ok')
  })

  it('empty: hasData false, 비율 null, comment null', async () => {
    use('empty')
    const r = await client().getReportSummary()
    if (r.kind !== 'ok') throw new Error('ok 가 아님')
    expect(r.data.hasData).toBe(false)
    expect(r.data.day.postureKeepRate).toBeNull()
    expect(r.data.comment).toBeNull()
  })

  it('잘못된 date 는 invalid_request', async () => {
    expect(await client().getReportSummary('2026-13-99')).toMatchObject({
      kind: 'error',
      reason: 'invalid_request'
    })
  })

  it.each([
    ['rate_limited', 'rate_limited'],
    ['server_error', 'server_error'],
    ['offline', 'offline']
  ] as const)('%s 시나리오 → error(%s)', async (scenario, reason) => {
    use(scenario)
    expect(await client().getReportSummary()).toMatchObject({ kind: 'error', reason })
  })
})
