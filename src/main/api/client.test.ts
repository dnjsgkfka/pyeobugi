import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { makeEvent } from '@shared/testing'
import { createApiClient, type ApiClient } from './client'
import { resetMock, setScenario } from '../mock/handlers'
import type { Scenario } from '../mock/scenarios'
import { server } from '../mock/server'

const DEVICE_ID = '3f2b8c1e-6a4d-4e0b-9b7a-0c1d2e3f4a5b'
const BASE = 'https://mock.turtle.local/api'

/** 받아 둔 기기 secret. 실제 앱처럼 client 들이 같은 값을 공유한다 */
const secrets = new Map<string, string>()

function client(deviceId = DEVICE_ID): ApiClient {
  const api: ApiClient = createApiClient({
    baseUrl: BASE,
    deviceId,
    deviceSecret: () => secrets.get(deviceId) ?? null,
    onUnauthorized: async () => {
      const result = await api.registerDevice()
      if (result.kind !== 'ok') return false
      secrets.set(deviceId, result.deviceSecret)
      return true
    },
    onError: () => {}
  })
  return api
}
function use(scenario: Scenario): void {
  setScenario(scenario)
}

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  resetMock()
  secrets.clear()
})
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

describe('기기 인증', () => {
  it('등록하면 secret 을 받고, 같은 ID 로 또 등록하면 409', async () => {
    const api = client()
    const first = await api.registerDevice()
    if (first.kind !== 'ok') throw new Error('ok 가 아님')
    expect(first.deviceSecret).toMatch(/^mock-secret-/)
    expect(await api.registerDevice()).toEqual({ kind: 'already' })
  })

  it('등록 전 요청은 401 을 받고, 자동으로 등록한 뒤 다시 보내 성공한다', async () => {
    const api = client()
    expect(secrets.has(DEVICE_ID)).toBe(false)
    const result = await api.postEvents([makeEvent('SESSION_START')])
    expect(result).toMatchObject({ kind: 'done', accepted: 1 })
    expect(secrets.get(DEVICE_ID)).toMatch(/^mock-secret-/)
  })

  it('secret 을 계속 거부하면 이벤트는 큐에 남긴다 (폐기하지 않음)', async () => {
    use('secret_invalid')
    expect(await client().postEvents([makeEvent('SESSION_START')])).toEqual({
      kind: 'retry',
      reason: 'device_secret_invalid'
    })
  })

  it('secret 을 계속 거부하면 리포트는 device_secret_invalid', async () => {
    use('secret_invalid')
    expect(await client().getReportSummary()).toMatchObject({
      kind: 'error',
      reason: 'device_secret_invalid'
    })
  })

  it('등록 엔드포인트가 없는 서버(BE 머지 전)에서는 secret 없이 그대로 동작한다', async () => {
    use('register_unavailable')
    expect(await client().registerDevice()).toEqual({ kind: 'unavailable' })
    expect(await client().postEvents([makeEvent('SESSION_START')])).toMatchObject({ kind: 'done' })
    expect(await client().getReportSummary()).toMatchObject({ kind: 'ok' })
  })
})
