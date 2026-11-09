import { setupServer } from 'msw/node'
import { handlers, setScenario } from './handlers'
import type { Scenario } from './scenarios'

export const server = setupServer(...handlers)

/** Node(main 프로세스)의 fetch 를 가로채 mock 응답을 돌려준다. 그 밖의 요청은 그대로 통과. */
export function startMock(scenario: Scenario = 'ok'): void {
  setScenario(scenario)
  server.listen({ onUnhandledFrame: 'bypass' })
  console.log(`[mock] API mock started (scenario: ${scenario})`)
}

export { setScenario, resetMock } from './handlers'
