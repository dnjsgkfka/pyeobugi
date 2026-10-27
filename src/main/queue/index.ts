import { app } from 'electron'
import { join } from 'node:path'
import { getApi } from '../api'
import { EventQueue } from './event-queue'

let queue: EventQueue | null = null

/** 앱 시작 시 한 번. 지난 실행에서 못 보낸 이벤트를 디스크에서 불러온다. */
export function initQueue(): EventQueue {
  queue = new EventQueue({
    filePath: join(app.getPath('userData'), 'event-queue.json'),
    send: (events) => getApi().postEvents(events)
  })
  queue.start()
  return queue
}

export function getQueue(): EventQueue {
  if (!queue) throw new Error('initQueue() must be called first')
  return queue
}
