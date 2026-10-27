import { app } from 'electron'
import { buildEvent } from './events'
import { getQueue } from './queue'
import { markQuitting } from './windows'

const SHUTDOWN_TIMEOUT_MS = 3_000

/** 앱 실행 → SESSION_START 를 쌓고, 지난 실행에서 남은 이벤트와 함께 바로 전송을 시도한다. */
export function startSession(): void {
  const queue = getQueue()
  queue.enqueue(buildEvent('SESSION_START', {}))
  void queue.flush()
}

async function endSession(): Promise<void> {
  const queue = getQueue()
  queue.enqueue(buildEvent('SESSION_END', {}))
  // 종료를 오래 붙잡지 않는다. 실패하면 큐에 남아 다음 실행에서 전송된다.
  await Promise.race([
    queue.flush({ ignoreBackoff: true }),
    new Promise<void>((resolve) => setTimeout(resolve, SHUTDOWN_TIMEOUT_MS))
  ])
  queue.stop()
}

/** 종료 직전에 SESSION_END 전송을 시도한 뒤 진짜로 종료한다. */
export function registerShutdown(): void {
  let shuttingDown = false
  app.on('before-quit', (event) => {
    markQuitting()
    if (shuttingDown) return
    shuttingDown = true
    event.preventDefault()
    endSession()
      .catch(() => {}) // 큐가 아직 없으면(시작 도중 종료) 그냥 종료
      .finally(() => app.quit())
  })
}
