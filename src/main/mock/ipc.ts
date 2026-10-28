import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc'
import { USE_MOCK } from '../api/config'
import { isScenario, type Scenario } from './scenarios'

let current: Scenario | null = null

/**
 * 개발용: 앱을 다시 켜지 않고 mock 시나리오를 바꾼다.
 * mock 이 꺼져 있으면 null 을 돌려주고 아무 일도 하지 않는다.
 */
export function registerMockIpc(scenario: Scenario): void {
  current = USE_MOCK ? scenario : null

  ipcMain.handle(IPC.MOCK_GET_SCENARIO, () => current)

  ipcMain.handle(IPC.MOCK_SET_SCENARIO, async (_event, next: unknown) => {
    if (!USE_MOCK || !isScenario(next)) return current
    const { setScenario } = await import('./server')
    setScenario(next)
    current = next
    return current
  })
}
