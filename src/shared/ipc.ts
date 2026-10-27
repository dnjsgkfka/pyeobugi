/** main / preload / renderer 가 함께 쓰는 IPC 채널과 타입. 채널 문자열은 여기서만 정의한다. */

export const WINDOW_NAMES = ['app', 'detector', 'overlay'] as const
export type WindowName = (typeof WINDOW_NAMES)[number]

export function isWindowName(value: unknown): value is WindowName {
  return typeof value === 'string' && (WINDOW_NAMES as readonly string[]).includes(value)
}

export const IPC = {
  APP_QUIT: 'app:quit',
  WINDOW_SHOW: 'window:show',
  WINDOW_HIDE: 'window:hide'
} as const

/** preload 가 renderer 에 노출하는 `window.api` 의 모양 */
export interface PreloadApi {
  app: {
    quit: () => void
  }
  window: {
    show: (name: WindowName) => void
    hide: (name: WindowName) => void
  }
}
