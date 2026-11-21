import { useEffect, useRef, useState } from 'react'
import { BubblePicker, STRETCH_EVERY_MS, type Bubble } from '@shared/bubble'
import type { PostureView } from '@shared/ipc'
import { moodFrom, neckFrom } from '@shared/pet'
import { formatRemaining, type PomodoroState } from '@shared/pomodoro'
import {
  DEFAULT_SETTINGS,
  TURTLE_SIZE_PX,
  type Sensitivity,
  type Settings
} from '@shared/schemas/settings'
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
  /**
   * 점수가 진입선을 넘은 시각 (우리 시계). 목 길이는 여기서부터 잰다.
   * 확정(BAD)되면 엔진이 이 값을 복귀 타이머로 돌려쓰므로 더 보내 주지 않는다 →
   * 후보로 처음 본 값을 자세가 돌아올 때까지 붙잡아 둔다.
   */
  const badCandidateAt = useRef<number | null>(null)
  /** 교정 강도 (목이 늘어나기 시작하는 시점이 달라진다) */
  const sensitivity = useRef<Sensitivity>(DEFAULT_SETTINGS.sensitivity)
  // Max turtle size (px). Kept in a ref so a re-created turtle starts at the current size
  const turtleMaxSize = useRef(TURTLE_SIZE_PX[DEFAULT_SETTINGS.turtleSize])

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
  /** 마지막으로 본 마우스 위치. 말풍선이 바뀔 때 다시 판단하는 데 쓴다 */
  const pointer = useRef({ x: -9999, y: -9999 })
  /** 포인터 추적 effect 가 채운다 */
  const syncClickable = useRef<() => void>(() => {})

  const [bubble, setBubble] = useState<Bubble | null>(null)
  /** 거북이를 보여 줄지 (설정의 오버레이 토글) */
  const [turtleOn, setTurtleOn] = useState(true)
  /** 머리 위·오른쪽 아래에 띄울 남은 시간 */
  const [timer, setTimer] = useState<PomodoroState | null>(null)

  useEffect(() => {
    const root = stage.current
    if (!root || !turtleOn) return
    root.innerHTML = TURTLE_HTML
    turtle.current = runTurtle(root, { maxSize: turtleMaxSize.current })
    return () => {
      turtle.current?.destroy()
      turtle.current = null
      root.innerHTML = ''
    }
  }, [turtleOn])

  /* 설정·뽀모도로·감지 상태를 모아 둔다 (말풍선 조건) */
  useEffect(() => {
    const applySettings = (settings: Settings): void => {
      setTurtleOn(settings.features.overlay)
      stretchOn.current = settings.features.stretch
      sensitivity.current = settings.sensitivity
      turtleMaxSize.current = TURTLE_SIZE_PX[settings.turtleSize]
      turtle.current?.setMaxSize(turtleMaxSize.current)
    }
    void window.api.settings.get().then(applySettings)
    const offSettings = window.api.settings.onChange((settings) => {
      applySettings(settings)
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
      // 후보(PENDING_BAD)로 처음 본 시각을 붙잡아 두고, 확정(BAD)까지 그대로 쓴다.
      // RECOVERING·GOOD 으로 돌아오면 버린다 (목이 줄어든다)
      const pending = feedback?.phase === 'PENDING_BAD'
      if (pending || mood === 'bad') {
        badCandidateAt.current ??= posture.current?.badCandidateSince ?? now
      } else badCandidateAt.current = null
      // 교정 강도에 따라 늘어나기 시작하는 시점만 앞당긴다 (엄격 즉시 / 보통 1.5초 / 느슨 3초).
      // 자세가 돌아오면 0 을 주고, 줄어드는 모습은 그림 쪽 애니메이션(최대 1.5초)에 맡긴다
      turtle.current?.setNeck(neckFrom(badCandidateAt.current, sensitivity.current, now))

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

  /* 말풍선이 바뀔 때마다 이벤트를 쌓는다. 클릭을 받을지는 아래 포인터 추적이 정한다 */
  useEffect(() => {
    if (bubble) window.api.posture.bubbleShown(bubble.event)
    bubbleClickable.current = bubble?.action === 'recalibrate'
    syncClickable.current()
  }, [bubble])

  /*
   * 오버레이는 화면 전체를 덮는 창이다. 클릭 통과를 끄면 그동안 바탕화면도, 다른 앱도
   * 누를 수 없다. 그래서 **포인터가 실제로 거북이나 누를 수 있는 말풍선 위에 있을 때만**
   * 끈다. "말풍선이 떠 있으면 켠다" 같은 상태 기반으로 두면 말풍선이 사라져도 그대로
   * 남아 화면이 먹통이 된다.
   *
   * 평소에는 setIgnoreMouseEvents(true, { forward: true }) 라 움직임은 계속 들어온다.
   */
  useEffect(() => {
    let over = false
    let dragging = false

    const onSomething = (x: number, y: number): boolean => {
      // 누를 수 있는 말풍선 (거리 안내 → 기준 다시 잡기)
      const box = bubbleClickable.current ? headBox.current?.getBoundingClientRect() : null
      if (box && x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) return true
      const at = turtle.current?.getPos()
      if (!at) return false
      return Math.abs(x - at.x) <= at.size * 0.6 && y >= at.y - at.size && y <= at.y + 8
    }

    const apply = (next: boolean): void => {
      if (next === over) return
      over = next
      document.body.style.cursor = next && turtle.current?.canGrab() === true ? 'grab' : ''
      window.api.posture.setClickable(next)
    }

    // 말풍선이 생기거나 사라질 때도 같은 기준으로 다시 계산한다
    syncClickable.current = () => {
      if (dragging) return
      const { x, y } = pointer.current
      apply(onSomething(x, y))
    }

    const stopDragging = (): void => {
      dragging = false
      document.body.style.cursor = ''
      over = true // 다음 apply 가 반드시 false 를 보내도록
      apply(false)
    }

    const onMove = (event: MouseEvent): void => {
      pointer.current = { x: event.clientX, y: event.clientY }
      if (dragging) {
        // 잡고 있는 중에 자세가 나빠지면 거북이가 스스로 손에서 떨어진다
        if (turtle.current?.isHeld() !== true) {
          stopDragging()
          return
        }
        turtle.current.moveGrab(event.clientX, event.clientY)
        return
      }
      apply(onSomething(event.clientX, event.clientY))
    }

    const onDown = (event: MouseEvent): void => {
      if (turtle.current?.grab(event.clientX, event.clientY, 'mouse') !== true) return
      dragging = true
      document.body.style.cursor = 'grabbing'
    }

    const onUp = (): void => {
      if (!dragging) return
      turtle.current?.release()
      stopDragging()
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      window.api.posture.setClickable(false)
    }
  }, [])

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
