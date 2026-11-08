import { BrowserWindow, ipcMain } from 'electron'
import { IPC } from '@shared/ipc'
import { Pomodoro, type PomodoroState } from '@shared/pomodoro'
import { buildEvent } from './events'
import { getSettings } from './onboarding'
import { getQueue } from './queue'

const env = import.meta.env
/** 개발용: 집중 10초 / 휴식 5초로 줄여 전환을 바로 확인한다 */
const FAST = env.MAIN_VITE_POMODORO_FAST === 'true'

const pomodoro = new Pomodoro(FAST ? { focusMs: 10_000, breakMs: 5_000 } : {})
let timer: ReturnType<typeof setInterval> | null = null

function broadcast(state: PomodoroState): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IPC.POMODORO_STATE, state)
  }
}

/** 1초마다 남은 시간을 줄이고, 집중이 끝나면 이벤트를 쌓는다. */
function tick(): void {
  const { state, focusCompleted } = pomodoro.tick(Date.now())
  if (focusCompleted) getQueue().enqueue(buildEvent('POMODORO_COMPLETED', {}))
  broadcast(state)
}

function run(): void {
  if (timer) return
  timer = setInterval(tick, 1_000)
}

function halt(): void {
  if (timer) clearInterval(timer)
  timer = null
}

export function startPomodoro(): PomodoroState {
  const state = pomodoro.start(Date.now())
  run()
  broadcast(state)
  return state
}

export function pausePomodoro(): PomodoroState {
  const state = pomodoro.pause(Date.now())
  halt()
  broadcast(state)
  return state
}

export function stopPomodoro(): PomodoroState {
  const state = pomodoro.stop()
  halt()
  broadcast(state)
  return state
}

export function registerPomodoroIpc(): void {
  if (FAST) console.log('[pomodoro] FAST mode: 10s focus / 5s break')

  ipcMain.handle(IPC.POMODORO_GET, () => pomodoro.value)
  ipcMain.on(IPC.POMODORO_COMMAND, (_event, command: unknown) => {
    if (command === 'start') startPomodoro()
    else if (command === 'pause') pausePomodoro()
    else if (command === 'stop') stopPomodoro()
  })
}

/**
 * 설정의 '공부 타이머' 토글을 따라간다.
 * 켜면 바로 돌고, 끄면 멈춘다 (감지와는 묶지 않는다 — 공부 시간을 세는 타이머라서).
 * 앱 시작과 설정 변경 때 부른다.
 */
export function applyStudyTimer(): void {
  const on = getSettings().value.features.studyTimer
  if (on === isPomodoroRunning()) return
  if (on) startPomodoro()
  else stopPomodoro()
}

export function isPomodoroRunning(): boolean {
  return pomodoro.value.running
}
