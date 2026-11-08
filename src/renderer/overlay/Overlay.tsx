import { useEffect, useRef, useState } from 'react'
import { BubblePicker, STRETCH_EVERY_MS, type Bubble } from '@shared/bubble'
import type { PostureView } from '@shared/ipc'
import { moodFrom, neckSince } from '@shared/pet'
import { formatRemaining, type PomodoroState } from '@shared/pomodoro'
import { SpeechBubble } from '@renderer/ui/SpeechBubble'
import './turtle.css'
import { runTurtle, type TurtleHandle } from './turtle-animation'
import { TURTLE_HTML } from './turtle-art'

/** 판정 결과는 추론 주기마다 온다. ref 에 담아 두고 주기적으로만 본다. */
const UPDATE_MS = 100
/** 복구 보상은 방금 끝난 것만 축하한다 (앱을 다시 켠 뒤 뒤늦게 뜨지 않게) */
const RECOVER_FRESH_MS = 5_000

export default function Overlay(): React.JSX.Element {
  const stage = useRef<HTMLDivElement>(null)
  const turtle = useRef<TurtleHandle | null>(null)
  const posture = useRef<PostureView | null>(null)
  /** 거북목으로 확정된 시각 (우리 시계). 목 길이는 여기서부터 잰다 */
  const badStartedAt = useRef<number | null>(null)

  const picker = useRef(new BubblePicker())
  /** 이미 본 종료 이벤트 id — 한 번만 축하한다 */
  const seenExit = useRef<number | null>(null)
  /** 스트레칭 안내를 마지막으로 띄운 시각 */
  const stretchAt = useRef(0)
  const stretchOn = useRef(false)
  const detecting = useRef(false)
  const pomodoro = useRef<PomodoroState | null>(null)

  const headBox = useRef<HTMLDivElement>(null)
  /** 누를 수 있는 말풍선이 떠 있나 (클릭을 받을지 판단에 함께 쓴다) */
  const bubbleClickable = useRef(false)

  const [bubble, setBubble] = useState<Bubble | null>(null)
  /** 거북이를 보여 줄지 (설정의 오버레이 토글) */
  const [turtleOn, setTurtleOn] = useState(true)
  /** 머리 위·오른쪽 아래에 띄울 남은 시간 */
  const [timer, setTimer] = useState<PomodoroState | null>(null)

  useEffect(() => {
    const root = stage.current
    if (!root || !turtleOn) return
    root.innerHTML = TURTLE_HTML
    turtle.current = runTurtle(root)
    return () => {
      turtle.current?.destroy()
      turtle.current = null
      root.innerHTML = ''
    }
  }, [turtleOn])

  /* 설정·뽀모도로·감지 상태를 모아 둔다 (말풍선 조건) */
  useEffect(() => {
    void window.api.settings.get().then((settings) => {
      setTurtleOn(settings.features.overlay)
      stretchOn.current = settings.features.stretch
    })
    const offSettings = window.api.settings.onChange((settings) => {
      setTurtleOn(settings.features.overlay)
      stretchOn.current = settings.features.stretch
      if (!settings.features.overlay) picker.current.reset()
    })

    void window.api.pomodoro.get().then((state) => {
      pomodoro.current = state
      setTimer(state.running ? state : null)
    })

    let phase: string | null = null
    const offPomodoro = window.api.pomodoro.onState((state) => {
      pomodoro.current = state
      setTimer(state.running ? state : null)
      // 휴식으로 막 바뀐 순간에만
      if (state.phase === 'break' && phase === 'focus') {
        picker.current.trigger('timer-break', Date.now())
      }
      phase = state.phase
    })

    const offDetection = window.api.posture.onDetection((state) => {
      // 감지를 시작한 순간 인사하고, 스트레칭 시계를 그때부터 센다
      if (state.running && !detecting.current) {
        const now = Date.now()
        picker.current.trigger('greeting', now)
        stretchAt.current = now
      }
      if (!state.running && detecting.current) picker.current.reset()
      detecting.current = state.running
    })

    return () => {
      offSettings()
      offPomodoro()
      offDetection()
    }
  }, [])

  useEffect(() => {
    const offPosture = window.api.posture.onState((next) => {
      posture.current = next
      const { lastExit, phase } = next.feedback
      if (!lastExit) return
      // 뷰가 새로 떴을 때 이미 있던 종료 이벤트는 소비된 것으로 본다
      if (seenExit.current === null) {
        seenExit.current = lastExit.id
        return
      }
      if (lastExit.id === seenExit.current) return
      seenExit.current = lastExit.id
      const fresh = Date.now() - lastExit.detectedAt < RECOVER_FRESH_MS
      if (lastExit.reason === 'RECOVERED' && phase === 'GOOD' && fresh) {
        picker.current.trigger('encourage', Date.now())
      }
    })

    const ticker = setInterval(() => {
      const now = Date.now()
      const feedback = posture.current?.feedback ?? null
      const mood = moodFrom(feedback)
      if (mood === 'bad') badStartedAt.current ??= now
      else badStartedAt.current = null
      // 거북목이면 확정된 순간부터 지금까지로 계산한다 — 매 프레임 조금씩 늘어난다.
      // 자세가 돌아오면 0 을 주고, 줄어드는 모습은 그림 쪽 애니메이션(최대 1.5초)에 맡긴다
      turtle.current?.setNeck(
        badStartedAt.current === null ? 0 : neckSince(badStartedAt.current, now)
      )

      // 스트레칭 안내: 감지 중이고 설정에서 켜 둔 경우만
      if (detecting.current && stretchOn.current && now - stretchAt.current >= STRETCH_EVERY_MS) {
        stretchAt.current = now
        picker.current.trigger('stretch', now)
      }

      const shown = picker.current.update(now, {
        posture: mood === 'bad',
        distance: posture.current?.distance.suggested === true,
        // 뽀모도로가 도는 동안에는 자세·휴식 전환만 띄운다 (머리 위가 남은 시간 자리)
        pomodoro: pomodoro.current?.running === true
      })
      setBubble((prev) => (prev?.kind === shown?.kind ? prev : shown))
    }, UPDATE_MS)

    return () => {
      clearInterval(ticker)
      offPosture()
    }
  }, [])

  /* 말풍선이 바뀔 때마다: 이벤트 적재 + 누를 수 있는 동안만 클릭 받기 */
  useEffect(() => {
    if (bubble) window.api.posture.bubbleShown(bubble.event)
    bubbleClickable.current = bubble?.action === 'recalibrate'
    if (bubbleClickable.current) window.api.posture.setClickable(true)
  }, [bubble])

  /*
   * 거북이를 끌어서 옮긴다 (가로만 — 작업 표시줄 위에 붙어 있으니 x 만 바꾼다).
   * 오버레이는 평소 클릭이 통과하므로, 마우스가 거북이 위에 있는 동안만 클릭을 받는다.
   */
  useEffect(() => {
    if (!turtleOn) return
    let over = false
    let dragging = false

    const onTurtle = (event: MouseEvent): boolean => {
      const at = turtle.current?.getPos()
      if (!at) return false
      return (
        Math.abs(event.clientX - at.x) <= at.size * 0.6 &&
        event.clientY >= at.y - at.size &&
        event.clientY <= at.y + 8
      )
    }

    const setClickable = (on: boolean): void => {
      window.api.posture.setClickable(on || bubbleClickable.current)
    }

    const onMove = (event: MouseEvent): void => {
      if (dragging) {
        turtle.current?.dragTo(event.clientX)
        return
      }
      const next = onTurtle(event)
      if (next === over) return
      over = next
      document.body.style.cursor = next ? 'grab' : ''
      setClickable(next)
    }

    const onDown = (event: MouseEvent): void => {
      if (!onTurtle(event)) return
      dragging = true
      document.body.style.cursor = 'grabbing'
      turtle.current?.dragTo(event.clientX)
    }

    const onUp = (): void => {
      if (!dragging) return
      dragging = false
      document.body.style.cursor = over ? 'grab' : ''
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      window.api.posture.setClickable(bubbleClickable.current)
    }
  }, [turtleOn])

  /* 말풍선은 목을 그리는 것과 같은 박자(매 프레임)로 옮긴다. React 로 다시 그리면 툭툭 끊긴다 */
  useEffect(() => {
    let frame = 0
    const follow = (): void => {
      const where = turtle.current?.getHead()
      const el = headBox.current
      if (where && el) {
        el.style.transform = `translate(${where.x}px, ${where.y - 8}px) translate(-50%, -100%)`
      }
      frame = requestAnimationFrame(follow)
    }
    frame = requestAnimationFrame(follow)
    return () => cancelAnimationFrame(frame)
  }, [])

  const onHead = turtleOn ? (bubble ?? (timer ? 'timer' : null)) : null

  return (
    <>
      {/* 거북이는 innerHTML 로 넣으므로 React 가 그리는 것과 칸을 나눈다 */}
      {turtleOn && <div ref={stage} className="fixed inset-0" />}

      {/* 머리 위 자리: 말풍선이 있으면 말풍선, 없으면 뽀모도로 남은 시간.
          머리를 그대로 따라가므로 화면 밖으로 나가면 같이 잘린다 */}
      {onHead && (
        <div
          ref={headBox}
          className="fixed top-0 left-0 will-change-transform"
          /* 첫 프레임에 왼쪽 위에서 번쩍이지 않게. 위의 rAF 가 머리 위로 옮긴다 */
          style={{ transform: 'translate(-9999px, -9999px)' }}
        >
          {bubble ? (
            bubble.action === 'recalibrate' ? (
              <button type="button" onClick={() => window.api.posture.openRecalibrate()}>
                <SpeechBubble>{bubble.message}</SpeechBubble>
              </button>
            ) : (
              <SpeechBubble>{bubble.message}</SpeechBubble>
            )
          ) : (
            timer && <TimerPill state={timer} />
          )}
        </div>
      )}

      {/* 거북이를 꺼 두면 머리 위에 띄울 수 없으니 오른쪽 아래에 */}
      {!turtleOn && timer && (
        <div className="fixed right-6 bottom-6">
          <TimerPill state={timer} />
        </div>
      )}
    </>
  )
}

/** 뽀모도로 남은 시간. 집중 / 휴식을 같이 보여 준다 */
function TimerPill({ state }: { state: PomodoroState }): React.JSX.Element {
  return (
    <div className="text-label-b flex items-center gap-2 rounded-pill bg-main1 px-3 py-1.5 text-main5 shadow-card">
      <span>{state.phase === 'focus' ? '집중' : '휴식'}</span>
      <span className="tabular-nums">{formatRemaining(state.remainingMs)}</span>
    </div>
  )
}
