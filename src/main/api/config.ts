import { isScenario, type Scenario } from '../mock/scenarios'

const env = import.meta.env

/**
 * mock 사용 여부.
 * - 개발: 기본 켜짐, `MAIN_VITE_USE_MOCK=false` 로 끈다
 * - 배포 빌드: 기본 꺼짐, `MAIN_VITE_USE_MOCK=true` 일 때만 켜짐
 */
export const USE_MOCK: boolean = env.PROD
  ? env.MAIN_VITE_USE_MOCK === 'true'
  : env.MAIN_VITE_USE_MOCK !== 'false'

export const API_BASE_URL: string = (
  env.MAIN_VITE_API_BASE_URL ??
  (USE_MOCK ? 'https://mock.turtle.local/api' : 'http://localhost:8080/api')
).replace(/\/$/, '')

export const MOCK_SCENARIO: Scenario = isScenario(env.MAIN_VITE_MOCK_SCENARIO)
  ? env.MAIN_VITE_MOCK_SCENARIO
  : 'ok'
