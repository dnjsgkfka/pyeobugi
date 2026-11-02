import { app } from 'electron'
import { loadOrCreateDevice, resetDevice, saveDeviceSecret, type Device } from '../device'
import { createApiClient, type ApiClient } from './client'
import { API_BASE_URL, MOCK_SCENARIO, USE_MOCK } from './config'

let client: ApiClient | null = null
let device: Device = { deviceId: '', deviceSecret: null }
let userDataDir = ''
/** 등록을 동시에 여러 번 하지 않게 진행 중인 약속을 붙잡아 둔다 */
let registering: Promise<boolean> | null = null

/** 앱 시작 시 한 번. mock 이 켜져 있으면 먼저 띄운다. */
export async function initApi(): Promise<ApiClient> {
  if (USE_MOCK) {
    // 배포 빌드에 msw 가 끼지 않도록 필요할 때만 불러온다
    const { startMock } = await import('../mock/server')
    startMock(MOCK_SCENARIO)
  }
  const { registerMockIpc } = await import('../mock/ipc')
  registerMockIpc(MOCK_SCENARIO)

  userDataDir = app.getPath('userData')
  device = loadOrCreateDevice(userDataDir)
  client = createApiClient({
    baseUrl: API_BASE_URL,
    deviceId: () => device.deviceId,
    deviceSecret: () => device.deviceSecret,
    onUnauthorized: () => {
      // 서버가 secret 을 거부했다 → 버리고 다시 등록한다
      device = { deviceId: device.deviceId, deviceSecret: null }
      return ensureRegistered()
    }
  })

  // 첫 요청을 막지 않는다. 등록이 늦거나 실패하면 그 요청만 401 을 받고 다시 시도한다.
  if (!device.deviceSecret) void ensureRegistered()
  return client
}

export function getApi(): ApiClient {
  if (!client) throw new Error('initApi() must be called first')
  return client
}

/** secret 이 갖춰졌으면 true. 이미 진행 중이면 그 결과를 함께 기다린다. */
async function ensureRegistered(): Promise<boolean> {
  if (device.deviceSecret) return true
  registering ??= register().finally(() => {
    registering = null
  })
  return registering
}

async function register(): Promise<boolean> {
  const api = getApi()
  const result = await api.registerDevice()

  if (result.kind === 'ok') {
    device = saveDeviceSecret(userDataDir, device, result.deviceSecret)
    console.log('[api] device registered')
    return true
  }

  if (result.kind === 'already') {
    // 서버에는 등록돼 있는데 우리에게 secret 이 없다 = 유실 → 새 기기 ID 로 다시 등록 (기록은 끊긴다)
    console.warn('[api] device already registered but secret is missing, issuing a new device id')
    device = resetDevice(userDataDir)
    const retried = await api.registerDevice()
    if (retried.kind !== 'ok') return false
    device = saveDeviceSecret(userDataDir, device, retried.deviceSecret)
    console.log('[api] device registered with a new id')
    return true
  }

  if (result.kind === 'unavailable') {
    // BE 인증 PR 머지 전 → secret 없이 그대로 쓴다
    console.log('[api] register endpoint not available yet, continuing without a secret')
    return false
  }

  console.warn('[api] device registration deferred')
  return false
}
