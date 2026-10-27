import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppEvent } from '@shared/schemas/events'
import { makeEvent } from '@shared/testing'
import { createApiClient, type PostEventsResult } from '../api/client'
import { resetMock, setScenario } from '../mock/handlers'
import { server } from '../mock/server'
import { EventQueue } from './event-queue'

const DONE = (batch: AppEvent[]): PostEventsResult => ({
  kind: 'done',
  accepted: batch.length,
  duplicated: 0,
  rejected: []
})

let dir: string
let file: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'turtle-queue-'))
  file = join(dir, 'queue.json')
})

function make(
  send: (events: AppEvent[]) => Promise<PostEventsResult>,
  extra: Partial<ConstructorParameters<typeof EventQueue>[0]> = {}
): EventQueue {
  return new EventQueue({ filePath: file, send, onError: () => {}, ...extra })
}
function events(n: number): AppEvent[] {
  return Array.from({ length: n }, () => makeEvent('SESSION_START'))
}

describe('디스크 저장', () => {
  it('쌓은 이벤트가 파일에 저장되고, 새 큐가 그대로 불러온다', () => {
    const q = make(async (b) => DONE(b))
    const e = events(3)
    e.forEach((x) => q.enqueue(x))
    expect(JSON.parse(readFileSync(file, 'utf8'))).toHaveLength(3)
    expect(existsSync(`${file}.tmp`)).toBe(false) // 임시 파일이 남지 않는다

    const reloaded = make(async (b) => DONE(b))
    expect(reloaded.size).toBe(3)
  })

  it('파일이 깨졌거나 유효하지 않은 이벤트가 섞여 있어도 시작된다', () => {
    const good = makeEvent('SESSION_END')
    writeFileSync(file, JSON.stringify([good, { type: 'NOPE' }, { ...good, pitch: 1 }]), 'utf8')
    expect(make(async (b) => DONE(b)).size).toBe(1)

    writeFileSync(file, '{not json', 'utf8')
    expect(make(async (b) => DONE(b)).size).toBe(0)
  })
})

describe('전송', () => {
  it('성공하면 큐에서 빠지고 파일도 비워진다', async () => {
    const send = vi.fn(async (b: AppEvent[]) => DONE(b))
    const q = make(send)
    events(5).forEach((x) => q.enqueue(x))
    await q.flush()
    expect(send).toHaveBeenCalledTimes(1)
    expect(q.size).toBe(0)
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual([])
  })

  it('20개가 쌓이면 바로 한 배치를 보낸다', async () => {
    const send = vi.fn(async (b: AppEvent[]) => DONE(b))
    const q = make(send)
    events(19).forEach((x) => q.enqueue(x))
    expect(send).not.toHaveBeenCalled()
    q.enqueue(makeEvent('SESSION_START'))
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1))
    expect(send.mock.calls[0][0]).toHaveLength(20)
  })

  it('한 번에 20개씩 순서대로 보낸다', async () => {
    const send = vi.fn(async (b: AppEvent[]) => DONE(b))
    const q = make(send)
    const all = events(45)
    all.forEach((x) => q.enqueue(x))
    await q.flush()
    const sent = send.mock.calls.flatMap((c) => c[0].map((e) => e.eventId))
    expect(sent).toEqual(all.map((e) => e.eventId))
    expect(Math.max(...send.mock.calls.map((c) => c[0].length))).toBe(20)
  })

  it('10초마다 보낸다 (그 전에는 보내지 않는다)', async () => {
    vi.useFakeTimers()
    try {
      const send = vi.fn(async (b: AppEvent[]) => DONE(b))
      const q = make(send)
      q.start()
      q.enqueue(makeEvent('SESSION_START'))
      await vi.advanceTimersByTimeAsync(9_000)
      expect(send).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(1_500)
      expect(send).toHaveBeenCalledTimes(1)
      q.stop()
    } finally {
      vi.useRealTimers()
    }
  })

  it('전송 중에 또 flush 해도 같은 이벤트를 두 번 보내지 않는다', async () => {
    let release: () => void = () => {}
    const send = vi.fn(
      (b: AppEvent[]) =>
        new Promise<PostEventsResult>((resolve) => {
          release = (): void => resolve(DONE(b))
        })
    )
    const q = make(send)
    events(3).forEach((x) => q.enqueue(x))
    const a = q.flush()
    const b = q.flush()
    release()
    await Promise.all([a, b])
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('전송 중에 새로 쌓인 이벤트는 현재 배치와 섞이지 않고 남는다', async () => {
    let release: () => void = () => {}
    const first = events(2)
    const send = vi
      .fn<(b: AppEvent[]) => Promise<PostEventsResult>>()
      .mockImplementationOnce(
        (b) =>
          new Promise((resolve) => {
            release = (): void => resolve(DONE(b))
          })
      )
      .mockImplementation(async (b) => DONE(b))
    const q = make(send)
    first.forEach((x) => q.enqueue(x))
    const p = q.flush()
    const late = makeEvent('SESSION_END')
    q.enqueue(late)
    release()
    await p
    expect(send.mock.calls[0][0].map((e) => e.eventId)).toEqual(first.map((e) => e.eventId))
    expect(send.mock.calls[1][0].map((e) => e.eventId)).toEqual([late.eventId])
    expect(q.size).toBe(0)
  })
})

describe('실패와 복구', () => {
  it('실패해도 이벤트는 큐와 파일에 남고, 복구되면 전송된다', async () => {
    let t = 0
    let ok = false
    const send = vi.fn(async (b: AppEvent[]): Promise<PostEventsResult> =>
      ok ? DONE(b) : { kind: 'retry', reason: 'offline' }
    )
    const q = make(send, { now: () => t })
    events(3).forEach((x) => q.enqueue(x))

    await q.flush()
    expect(q.size).toBe(3)
    expect(JSON.parse(readFileSync(file, 'utf8'))).toHaveLength(3)

    ok = true
    t += 60_000
    await q.flush()
    expect(q.size).toBe(0)
  })

  it('백오프 시간 안에는 다시 보내지 않고, 지나면 보낸다 (지수로 늘어난다)', async () => {
    let t = 0
    const send = vi.fn(async (): Promise<PostEventsResult> => ({
      kind: 'retry',
      reason: 'server_error'
    }))
    const q = make(send, { now: () => t })
    q.enqueue(makeEvent('SESSION_START'))

    await q.flush() // 1번째 실패 → 2초 대기
    await q.flush()
    expect(send).toHaveBeenCalledTimes(1)

    t = 2_000
    await q.flush() // 2번째 실패 → 4초 대기
    expect(send).toHaveBeenCalledTimes(2)
    t = 5_000
    await q.flush()
    expect(send).toHaveBeenCalledTimes(2)
    t = 6_000
    await q.flush()
    expect(send).toHaveBeenCalledTimes(3)
  })

  it('429 의 retryAfter 만큼은 기다린다', async () => {
    let t = 0
    const send = vi.fn(async (): Promise<PostEventsResult> => ({
      kind: 'retry',
      reason: 'rate_limited',
      retryAfterSec: 30
    }))
    const q = make(send, { now: () => t })
    q.enqueue(makeEvent('SESSION_START'))
    await q.flush()
    t = 29_000
    await q.flush()
    expect(send).toHaveBeenCalledTimes(1)
    t = 30_000
    await q.flush()
    expect(send).toHaveBeenCalledTimes(2)
  })

  it('ignoreBackoff 면 대기 중이어도 한 번 시도한다 (종료 직전)', async () => {
    const send = vi.fn(async (): Promise<PostEventsResult> => ({
      kind: 'retry',
      reason: 'offline'
    }))
    const q = make(send, { now: () => 0 })
    q.enqueue(makeEvent('SESSION_START'))
    await q.flush()
    await q.flush({ ignoreBackoff: true })
    expect(send).toHaveBeenCalledTimes(2)
  })

  it('성공하면 실패 횟수가 초기화된다', async () => {
    let t = 0
    const results: PostEventsResult[] = [
      { kind: 'retry', reason: 'offline' },
      { kind: 'retry', reason: 'offline' }
    ]
    const send = vi.fn(async (b: AppEvent[]) => results.shift() ?? DONE(b))
    const q = make(send, { now: () => t })
    q.enqueue(makeEvent('SESSION_START'))
    await q.flush()
    t = 2_000
    await q.flush()
    t = 10_000
    await q.flush() // 성공
    q.enqueue(makeEvent('SESSION_END'))
    results.push({ kind: 'retry', reason: 'offline' })
    await q.flush() // 실패 → 다시 2초부터
    t = 12_000
    await q.flush()
    expect(q.size).toBe(0)
  })
})

describe('폐기와 분할', () => {
  it('discard(400 등)는 재시도 없이 큐에서 뺀다', async () => {
    const send = vi.fn(async (): Promise<PostEventsResult> => ({
      kind: 'discard',
      reason: 'invalid_request'
    }))
    const q = make(send)
    events(3).forEach((x) => q.enqueue(x))
    await q.flush()
    expect(send).toHaveBeenCalledTimes(1)
    expect(q.size).toBe(0)
  })

  it('rejected 가 섞여 있어도 응답이 done 이면 모두 큐에서 뺀다', async () => {
    const send = vi.fn(async (b: AppEvent[]): Promise<PostEventsResult> => ({
      kind: 'done',
      accepted: b.length - 1,
      duplicated: 0,
      rejected: [{ index: 0, code: 'INVALID_PAYLOAD' }]
    }))
    const q = make(send)
    events(4).forEach((x) => q.enqueue(x))
    await q.flush()
    expect(q.size).toBe(0)
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('413(split)은 반으로 쪼개 보낸다', async () => {
    const send = vi.fn(async (b: AppEvent[]): Promise<PostEventsResult> =>
      b.length > 5 ? { kind: 'split' } : DONE(b)
    )
    const q = make(send)
    const all = events(12)
    all.forEach((x) => q.enqueue(x))
    await q.flush()
    expect(q.size).toBe(0)
    const sizes = send.mock.calls.map((c) => c[0].length)
    expect(sizes[0]).toBe(12)
    expect(sizes[1]).toBe(6)
    const delivered = send.mock.calls.filter((c) => c[0].length <= 5).flatMap((c) => c[0])
    expect(delivered.map((e) => e.eventId)).toEqual(all.map((e) => e.eventId))
  })

  it('쪼개 보내다 중간에 실패하면 나머지는 큐에 남는다', async () => {
    const t = 0
    let call = 0
    const send = vi.fn(async (b: AppEvent[]): Promise<PostEventsResult> => {
      call++
      if (call === 1) return { kind: 'split' }
      if (call === 2) return DONE(b) // 앞 절반 성공
      return { kind: 'retry', reason: 'offline' } // 뒤 절반 실패
    })
    const q = make(send, { now: () => t })
    events(4).forEach((x) => q.enqueue(x))
    await q.flush()
    expect(q.size).toBe(2)
  })
})

describe('상한', () => {
  it('5,000개를 넘으면 오래된 것부터 버린다', () => {
    const q = make(async (b) => DONE(b), { maxSize: 5, batchSize: 1000 })
    const all = events(8)
    all.forEach((x) => q.enqueue(x))
    expect(q.size).toBe(5)
    const saved = JSON.parse(readFileSync(file, 'utf8')) as AppEvent[]
    expect(saved.map((e) => e.eventId)).toEqual(all.slice(3).map((e) => e.eventId))
  })

  it('기본 상한은 5,000 (불러올 때도 적용)', () => {
    const e = makeEvent('SESSION_START')
    const many = Array.from({ length: 5_003 }, () => ({ ...e, eventId: crypto.randomUUID() }))
    writeFileSync(file, JSON.stringify(many), 'utf8')
    const q = make(async (b) => DONE(b))
    expect(q.size).toBe(5_000)
  })
})

describe('실제 클라이언트 + mock 서버', () => {
  const client = createApiClient({
    baseUrl: 'https://mock.turtle.local/api',
    deviceId: '3f2b8c1e-6a4d-4e0b-9b7a-0c1d2e3f4a5b',
    onError: () => {}
  })
  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
  afterEach(() => resetMock())
  afterAll(() => server.close())

  it.each(['offline', 'server_error', 'rate_limited'] as const)(
    '%s 동안 큐에 남고, 복구 후 전송된다',
    async (scenario) => {
      let t = 0
      const q = make((b) => client.postEvents(b), { now: () => t })
      events(3).forEach((x) => q.enqueue(x))

      setScenario(scenario)
      await q.flush()
      expect(q.size).toBe(3)

      setScenario('ok')
      t += 60_000
      await q.flush()
      expect(q.size).toBe(0)
    }
  )

  it('종료 때 SESSION_END 전송이 실패하면 파일에 남아 다음 실행에서 전송된다', async () => {
    const end = makeEvent('SESSION_END')
    const first = make((b) => client.postEvents(b))
    first.enqueue(end)
    setScenario('offline')
    await first.flush({ ignoreBackoff: true })
    expect(first.size).toBe(1)

    // 다음 실행: 같은 파일에서 다시 불러온다
    setScenario('ok')
    const next = make((b) => client.postEvents(b))
    expect(next.size).toBe(1)
    await next.flush()
    expect(next.size).toBe(0)
  })

  it('같은 이벤트를 다시 보내도(응답 유실) duplicated 로 정리된다', async () => {
    const e = makeEvent('POSTURE_BAD')
    await client.postEvents([e]) // 서버는 받았지만 응답이 유실됐다고 가정
    const q = make((b) => client.postEvents(b))
    q.enqueue(e)
    await q.flush()
    expect(q.size).toBe(0)
  })
})
