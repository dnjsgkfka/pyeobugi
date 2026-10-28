import { app } from 'electron'
import { loadOrCreateDeviceId } from '../device'
import { createApiClient, type ApiClient } from './client'
import { API_BASE_URL, MOCK_SCENARIO, USE_MOCK } from './config'

let client: ApiClient | null = null

/** 앱 시작 시 한 번. mock 이 켜져 있으면 먼저 띄운다. */
export async function initApi(): Promise<ApiClient> {
  if (USE_MOCK) {
    // 배포 빌드에 msw 가 끼지 않도록 필요할 때만 불러온다
    const { startMock } = await import('../mock/server')
    startMock(MOCK_SCENARIO)
  }
  const { registerMockIpc } = await import('../mock/ipc')
  registerMockIpc(MOCK_SCENARIO)
  const deviceId = loadOrCreateDeviceId(app.getPath('userData'))
  client = createApiClient({ baseUrl: API_BASE_URL, deviceId })
  return client
}

export function getApi(): ApiClient {
  if (!client) throw new Error('initApi() must be called first')
  return client
}
