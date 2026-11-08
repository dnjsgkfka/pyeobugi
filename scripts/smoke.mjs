/* eslint-disable @typescript-eslint/explicit-function-return-type */
/*
 * 실서버 계약 스모크 테스트 (#14).
 *
 *   node scripts/smoke.mjs                 # 새 기기로 전체 실행
 *   node scripts/smoke.mjs --rate-limit    # 429 까지 확인 (요청을 많이 보낸다)
 *   node scripts/smoke.mjs --base http://localhost:8080/api
 *
 * 운영 서버에 테스트 기기와 이벤트가 실제로 쌓인다. 마지막에 찍히는 기기 ID 를 기록해 두고,
 * 정리가 필요하면 BE 에 그 ID 로 삭제를 요청한다.
 */
import { randomUUID } from 'node:crypto'

const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const value = (name, fallback) => {
  const at = args.indexOf(`--${name}`)
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback
}

const BASE = value('base', 'https://pyeobugi-server-production.up.railway.app/api').replace(
  /\/$/,
  ''
)
const deviceId = value('device', randomUUID())
let deviceSecret = value('secret', null)

const results = []

function record(name, ok, detail) {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

async function call(path, { method = 'GET', body, secret = deviceSecret } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Device-Id': deviceId,
      ...(secret ? { 'X-Device-Secret': secret } : {})
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  })
  let json = null
  try {
    json = await res.json()
  } catch {
    json = null
  }
  return { status: res.status, body: json, retryAfter: res.headers.get('Retry-After') }
}

/* ── 이벤트 만들기 (KST +09:00, 초 단위) ───────────────────────────── */
const sessionId = randomUUID()
const kst = (at = new Date()) => {
  const shifted = new Date(at.getTime() + 9 * 60 * 60 * 1000)
  return `${shifted.toISOString().slice(0, 19)}+09:00`
}
const event = (type, payload = {}, occurredAt = kst()) => ({
  eventId: randomUUID(),
  type,
  sessionId,
  occurredAt,
  payload
})

function segment(startedAt, durationSec, badDurationSec = 0) {
  const started = new Date(startedAt)
  const ended = new Date(started.getTime() + durationSec * 1000)
  return event(
    'USAGE_SEGMENT',
    {
      startedAt: kst(started),
      endedAt: kst(ended),
      durationSec,
      badDurationSec
    },
    kst(ended)
  )
}

const post = (events, options) => call('/events', { method: 'POST', body: { events }, ...options })

/* ── 1. 기기 등록 ───────────────────────────────────────────────── */
async function devices() {
  const first = await call('/devices/register', { method: 'POST', secret: null })
  if (first.status === 200 && typeof first.body?.deviceSecret === 'string') {
    deviceSecret = first.body.deviceSecret
    record('register → 200 + deviceSecret', true)
  } else {
    record(
      'register → 200 + deviceSecret',
      false,
      `status ${first.status} ${JSON.stringify(first.body)}`
    )
    return false
  }

  const again = await call('/devices/register', { method: 'POST' })
  record(
    'register 재시도 → 409 DEVICE_ALREADY_REGISTERED',
    again.status === 409 && again.body?.code === 'DEVICE_ALREADY_REGISTERED',
    `status ${again.status} code ${again.body?.code ?? '-'}`
  )

  const noSecret = await post([event('SESSION_START')], { secret: null })
  record(
    'secret 없이 events → 401 DEVICE_SECRET_INVALID',
    noSecret.status === 401 && noSecret.body?.code === 'DEVICE_SECRET_INVALID',
    `status ${noSecret.status} code ${noSecret.body?.code ?? '-'}`
  )

  const wrongSecret = await post([event('SESSION_START')], { secret: 'not-the-secret' })
  record(
    '틀린 secret → 401',
    wrongSecret.status === 401,
    `status ${wrongSecret.status} code ${wrongSecret.body?.code ?? '-'}`
  )
  return true
}

/* ── 2. 이벤트 계약 ─────────────────────────────────────────────── */
async function events() {
  const start = event('SESSION_START')
  const accepted = await post([start])
  record(
    'accepted 1',
    accepted.status === 200 && accepted.body?.accepted === 1,
    JSON.stringify(accepted.body)
  )

  const duplicated = await post([start])
  record(
    '같은 eventId 재전송 → duplicated 1',
    duplicated.body?.duplicated === 1,
    JSON.stringify(duplicated.body)
  )

  const forbidden = await post([event('SESSION_START', { pitch: 12.5 })])
  record(
    '금지 필드(payload.pitch) → FORBIDDEN_FIELD',
    forbidden.body?.rejected?.[0]?.code === 'FORBIDDEN_FIELD',
    JSON.stringify(forbidden.body)
  )

  const unknown = await post([event('NOT_A_TYPE')])
  record(
    '모르는 type → UNKNOWN_TYPE',
    unknown.body?.rejected?.[0]?.code === 'UNKNOWN_TYPE',
    JSON.stringify(unknown.body)
  )

  const tooLong = await post([segment(Date.now() - 3601 * 1000, 3601)])
  record(
    'durationSec 3601 → INVALID_PAYLOAD',
    tooLong.body?.rejected?.[0]?.code === 'INVALID_PAYLOAD',
    JSON.stringify(tooLong.body)
  )

  const future = await post([
    event('SESSION_START', {}, kst(new Date(Date.now() + 10 * 60 * 1000)))
  ])
  record(
    '미래 +10분 → OCCURRED_AT_OUT_OF_RANGE',
    future.body?.rejected?.[0]?.code === 'OCCURRED_AT_OUT_OF_RANGE',
    JSON.stringify(future.body)
  )

  const many = await post(Array.from({ length: 101 }, () => event('SESSION_START')))
  record(
    '101개 → 413 PAYLOAD_TOO_LARGE',
    many.status === 413,
    `status ${many.status} code ${many.body?.code ?? '-'}`
  )

  const empty = await post([])
  record(
    '빈 배열 → 400 INVALID_REQUEST',
    empty.status === 400,
    `status ${empty.status} code ${empty.body?.code ?? '-'}`
  )

  const extra = await call('/events', {
    method: 'POST',
    body: { events: [event('SESSION_START')], extra: 1 }
  })
  record(
    '최상위 모르는 필드 → 400 INVALID_REQUEST',
    extra.status === 400,
    `status ${extra.status} code ${extra.body?.code ?? '-'}`
  )
}

/* ── 3. 사용 구간 한 묶음 (리포트 숫자 대조용) ───────────────────── */
async function usage() {
  const base = Date.now() - 10 * 60 * 1000
  const segments = Array.from({ length: 10 }, (_, i) =>
    segment(base + i * 60 * 1000, 60, i < 3 ? 30 : 0)
  )
  const sent = await post([...segments, event('POSTURE_BAD', { severity: 'MODERATE' })])
  record(
    '사용 구간 10분(나쁜 자세 90초) + POSTURE_BAD 적재',
    sent.body?.accepted === 11,
    JSON.stringify(sent.body)
  )
  return { usageSeconds: 600, badSeconds: 90, turtleNeckCount: 1 }
}

/* ── 4. 리포트 ─────────────────────────────────────────────────── */
async function report(expected) {
  const today = await call('/reports/summary')
  const data = today.body ?? {}
  record('리포트 조회 → 200', today.status === 200, `status ${today.status}`)

  const fields = ['hasData', 'generatedAt', 'date', 'day', 'week', 'hourly']
  const missing = fields.filter((key) => data[key] === undefined)
  record('Swagger 필수 필드 존재', missing.length === 0, missing.length ? `없음: ${missing}` : '')

  const optional = ['yesterday', 'lastWeek', 'turtleNeckTimeline', 'distribution', 'comment']
  record(
    '선택 필드 확인',
    true,
    optional.map((key) => `${key}=${data[key] === undefined ? '없음' : '있음'}`).join(' ')
  )

  if (expected) {
    const keepRate = Math.round(
      ((expected.usageSeconds - expected.badSeconds) / expected.usageSeconds) * 100
    )
    record(
      `usageSeconds ≥ ${expected.usageSeconds}`,
      (data.day?.usageSeconds ?? 0) >= expected.usageSeconds,
      `받은 값 ${data.day?.usageSeconds}`
    )
    record(
      `postureKeepRate ≈ ${keepRate}`,
      Math.abs((data.day?.postureKeepRate ?? -1) - keepRate) <= 1,
      `받은 값 ${data.day?.postureKeepRate}`
    )
    record(
      `turtleNeckCount ≥ ${expected.turtleNeckCount}`,
      (data.day?.turtleNeckCount ?? 0) >= expected.turtleNeckCount,
      `받은 값 ${data.day?.turtleNeckCount}`
    )
    record(
      'hourly 칸 수',
      Array.isArray(data.hourly),
      `${Array.isArray(data.hourly) ? data.hourly.length : '배열 아님'}칸 / null 포함 ${
        Array.isArray(data.hourly) ? data.hourly.some((h) => h.postureKeepRate === null) : '-'
      }`
    )
    record(
      'distribution 상태별 초',
      data.distribution !== undefined,
      JSON.stringify(data.distribution ?? null)
    )
  }

  const past = await call('/reports/summary?date=2020-01-01')
  record(
    '기록 없는 날 → hasData false',
    past.status === 200 && past.body?.hasData === false,
    `status ${past.status} hasData ${past.body?.hasData} day ${JSON.stringify(past.body?.day ?? null)}`
  )

  const bad = await call('/reports/summary?date=2026-13-99')
  record(
    '잘못된 date → 400 INVALID_REQUEST',
    bad.status === 400,
    `status ${bad.status} code ${bad.body?.code ?? '-'}`
  )
}

/* ── 5. 429 (선택) ─────────────────────────────────────────────── */
async function rateLimit() {
  for (let i = 0; i < 200; i++) {
    const res = await post([event('SESSION_START')])
    if (res.status === 429) {
      record(
        '429 RATE_LIMITED + retryAfter',
        res.body?.retryAfter !== undefined || res.retryAfter !== null,
        `${i + 1}번째 요청, body.retryAfter=${res.body?.retryAfter} header=${res.retryAfter}`
      )
      return
    }
  }
  record('429 RATE_LIMITED', false, '200번 보내도 제한이 걸리지 않음 (rate limit 미설정?)')
}

/* ── 실행 ──────────────────────────────────────────────────────── */
console.log(`base: ${BASE}`)
console.log(`deviceId: ${deviceId}\n`)

if (await devices()) {
  await events()
  const expected = await usage()
  await report(expected)
  if (flag('rate-limit')) await rateLimit()
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length} / ${results.length} 통과`)
if (failed.length) {
  console.log('\n실패:')
  for (const r of failed) console.log(`  - ${r.name}: ${r.detail}`)
}
console.log(`\n테스트 기기 ID: ${deviceId}`)
process.exit(failed.length ? 1 : 0)
