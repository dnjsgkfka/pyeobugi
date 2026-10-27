import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { validateEvent, type AppEvent } from '@shared/schemas/events'
import { backoffMs } from '../api/backoff'
import type { PostEventsResult } from '../api/client'

export interface EventQueueOptions {
  /** 큐를 저장할 JSON 파일 */
  filePath: string
  send: (events: AppEvent[]) => Promise<PostEventsResult>
  /** 주기 전송 간격 (기본 10초) */
  flushIntervalMs?: number
  /** 한 배치 크기, 이만큼 쌓이면 바로 전송 (기본 20) */
  batchSize?: number
  /** 큐 상한, 넘으면 오래된 것부터 버림 (기본 5,000) */
  maxSize?: number
  now?: () => number
  /** 이벤트 내용은 남기지 않는다. 개수와 사유만. */
  onError?: (message: string, info?: Record<string, unknown>) => void
}

export interface FlushOptions {
  /** 백오프 대기 중이어도 한 번 시도한다 (앱 종료 직전 등) */
  ignoreBackoff?: boolean
}

/**
 * 디스크에 저장되는 이벤트 큐.
 * - 쓸 때마다 임시 파일에 쓰고 rename 해서 파일이 반쯤 쓰인 채 남지 않게 한다
 * - 전송은 한 번에 하나씩, 보낸 배치의 스냅샷 기준으로 응답을 처리한다
 *   (전송 중에 새로 쌓인 이벤트와 섞이지 않는다)
 */
export class EventQueue {
  private items: AppEvent[] = []
  private timer: ReturnType<typeof setInterval> | null = null
  private inFlight: Promise<void> | null = null
  private failures = 0
  private blockedUntil = 0

  private readonly filePath: string
  private readonly send: EventQueueOptions['send']
  private readonly flushIntervalMs: number
  private readonly batchSize: number
  private readonly maxSize: number
  private readonly now: () => number
  private readonly onError: NonNullable<EventQueueOptions['onError']>

  constructor(options: EventQueueOptions) {
    this.filePath = options.filePath
    this.send = options.send
    this.flushIntervalMs = options.flushIntervalMs ?? 10_000
    this.batchSize = options.batchSize ?? 20
    this.maxSize = options.maxSize ?? 5_000
    this.now = options.now ?? Date.now
    this.onError =
      options.onError ?? ((message, info): void => console.error(`[queue] ${message}`, info ?? ''))
    this.load()
  }

  get size(): number {
    return this.items.length
  }

  /** 주기 전송을 시작한다. */
  start(): void {
    if (this.timer) return
    this.timer = setInterval(() => void this.flush(), this.flushIntervalMs)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  /** 이벤트를 쌓고 저장한다. 배치 크기에 도달하면 바로 전송을 시도한다. */
  enqueue(event: AppEvent): void {
    this.items.push(event)
    const overflow = this.items.length - this.maxSize
    if (overflow > 0) {
      this.items.splice(0, overflow)
      this.onError('queue is full, dropped oldest events', { dropped: overflow })
    }
    this.persist()
    if (this.items.length >= this.batchSize) void this.flush()
  }

  /** 쌓인 이벤트를 모두 보내려고 시도한다. 실패하면 멈추고 큐에 남긴다. */
  flush(options: FlushOptions = {}): Promise<void> {
    if (this.inFlight) return this.inFlight
    if (!options.ignoreBackoff && this.now() < this.blockedUntil) return Promise.resolve()
    this.inFlight = this.drain().finally(() => {
      this.inFlight = null
    })
    return this.inFlight
  }

  private async drain(): Promise<void> {
    while (this.items.length > 0) {
      const batch = this.items.slice(0, this.batchSize) // 스냅샷
      if (!(await this.sendBatch(batch))) return
    }
  }

  /** @returns 계속 보내도 되면 true, 멈춰야 하면 false */
  private async sendBatch(batch: AppEvent[]): Promise<boolean> {
    const result = await this.send(batch)
    switch (result.kind) {
      case 'done':
        // accepted / duplicated 는 전송 완료, rejected 는 재시도 없이 폐기 — 전부 큐에서 뺀다
        this.remove(batch)
        this.failures = 0
        return true
      case 'discard':
        this.onError('discarding batch', { count: batch.length, reason: result.reason })
        this.remove(batch)
        this.failures = 0
        return true
      case 'split': {
        const mid = Math.ceil(batch.length / 2)
        return (
          (await this.sendBatch(batch.slice(0, mid))) && (await this.sendBatch(batch.slice(mid)))
        )
      }
      case 'retry':
        this.failures++
        this.blockedUntil = this.now() + backoffMs(this.failures - 1, result.retryAfterSec)
        return false
    }
  }

  private remove(batch: AppEvent[]): void {
    const ids = new Set(batch.map((e) => e.eventId))
    this.items = this.items.filter((e) => !ids.has(e.eventId))
    this.persist()
  }

  private load(): void {
    mkdirSync(dirname(this.filePath), { recursive: true })
    try {
      const raw: unknown = JSON.parse(readFileSync(this.filePath, 'utf8'))
      if (!Array.isArray(raw)) return
      const now = new Date(this.now())
      for (const entry of raw) {
        const result = validateEvent(entry, now) // 깨졌거나 30일 넘은 이벤트는 서버가 어차피 거부한다
        if (result.ok) this.items.push(result.event)
      }
      if (this.items.length > this.maxSize) this.items.splice(0, this.items.length - this.maxSize)
    } catch {
      // 파일이 없거나 깨졌으면 빈 큐로 시작
    }
  }

  /** 임시 파일에 쓰고 rename → 쓰는 도중 꺼져도 이전 파일이 멀쩡하다 */
  private persist(): void {
    const tmp = `${this.filePath}.tmp`
    try {
      writeFileSync(tmp, JSON.stringify(this.items), 'utf8')
      renameSync(tmp, this.filePath)
    } catch (error) {
      this.onError('failed to persist queue', { message: (error as Error).message })
    }
  }
}
