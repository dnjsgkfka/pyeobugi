import { app, ipcMain } from 'electron'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { IPC } from '@shared/ipc'
import type { ReportView } from '@shared/report'
import { ReportSummarySchema, type ReportSummary } from '@shared/schemas/responses'
import { isKstDateString, kstDateString, toKstIso } from '@shared/time'
import { getApi } from './api'
import { flushUsage } from './posture'
import { getQueue } from './queue'

/** 큐를 비우기를 기다리는 한도. 넘으면 그냥 조회한다 (API 문서의 2초) */
const FLUSH_TIMEOUT_MS = 2_000

type Cache = Record<string, { data: ReportSummary; cachedAt: string }>

let cacheFile = ''
let cache: Cache = {}

export function initReport(): void {
  cacheFile = join(app.getPath('userData'), 'report-cache.json')
  cache = loadCache()
}

function loadCache(): Cache {
  try {
    const raw: unknown = JSON.parse(readFileSync(cacheFile, 'utf8'))
    if (typeof raw !== 'object' || raw === null) return {}
    const result: Cache = {}
    for (const [date, entry] of Object.entries(raw as Record<string, unknown>)) {
      const parsed = ReportSummarySchema.safeParse((entry as { data?: unknown })?.data)
      const cachedAt = (entry as { cachedAt?: unknown })?.cachedAt
      if (parsed.success && typeof cachedAt === 'string') {
        result[date] = { data: parsed.data, cachedAt }
      }
    }
    return result
  } catch {
    return {}
  }
}

function saveCache(): void {
  const tmp = `${cacheFile}.tmp`
  try {
    mkdirSync(dirname(cacheFile), { recursive: true })
    writeFileSync(tmp, JSON.stringify(cache), 'utf8')
    renameSync(tmp, cacheFile)
  } catch (error) {
    console.error('[report] failed to cache:', (error as Error).message)
  }
}

/**
 * 리포트를 조회한다.
 *
 * 방금 한 활동이 리포트에 반영되도록, 조회 전에
 * (1) 쌓이던 사용 구간을 마감하고 (2) 큐를 비운다.
 * 큐 비우기가 2초 안에 안 끝나면 기다리지 않고 조회한다 (화면이 멈추지 않게).
 */
export async function fetchReport(date?: string): Promise<ReportView> {
  const key = date ?? kstDateString(new Date())

  // 완료 기준 확인용 기록: 마감 → 전송 → 조회 순서가 보이도록 남긴다
  const queue = getQueue()
  const closed = flushUsage()
  const pending = queue.size
  console.log(`[report] closed ${closed} segment(s), ${pending} event(s) queued`)

  const startedAt = Date.now()
  await Promise.race([
    queue.flush(),
    new Promise<void>((resolve) => setTimeout(resolve, FLUSH_TIMEOUT_MS))
  ])
  const waited = Date.now() - startedAt
  console.log(`[report] flush done in ${waited}ms, ${queue.size} event(s) left`)

  const result = await getApi().getReportSummary(date)
  console.log(`[report] GET ${key} -> ${result.kind}`)
  if (result.kind === 'ok') {
    cache[key] = { data: result.data, cachedAt: toKstIso(new Date()) }
    saveCache()
    return { kind: 'ok', data: result.data }
  }

  const cached = cache[key]
  if (cached) {
    return {
      kind: 'stale',
      data: cached.data,
      cachedAt: cached.cachedAt,
      reason: result.reason
    }
  }
  return { kind: 'error', reason: result.reason }
}

/**
 * 기록이 있는 날짜들.
 * TODO(BE): 월별 기록 날짜 목록이 응답에 없다. 지금은 한 번이라도 받아 둔 날짜로만 채운다.
 */
export function recordedDates(): string[] {
  return Object.entries(cache)
    .filter(([, entry]) => entry.data.hasData)
    .map(([date]) => date)
}

export function registerReportIpc(): void {
  ipcMain.handle(IPC.REPORT_RECORDED_DATES, () => recordedDates())

  ipcMain.handle(IPC.REPORT_GET, (_event, date: unknown) => {
    const key = typeof date === 'string' && isKstDateString(date) ? date : undefined
    return fetchReport(key)
  })
}
