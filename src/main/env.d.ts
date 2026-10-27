/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `false` 면 mock 을 끈다 (개발 기본: 켜짐) */
  readonly MAIN_VITE_USE_MOCK?: string
  readonly MAIN_VITE_API_BASE_URL?: string
  /** ok | empty | rate_limited | server_error | offline | payload_too_large */
  readonly MAIN_VITE_MOCK_SCENARIO?: string
}
