import { useEffect, useRef, useState } from 'react'
import { moodFrom, neckSince, nextNeck, type PetState } from '@shared/pet'
import type { PostureView } from '@shared/ipc'
import './turtle.css'
import { runTurtle, type TurtleHandle } from './turtle-animation'
import { TURTLE_HTML } from './turtle-art'

/** 자세 샘플은 초당 여러 번 온다. ref 에 담아 두고 주기적으로만 본다. */
const UPDATE_MS = 100

export default function Overlay(): React.JSX.Element {
  const stage = useRef<HTMLDivElement>(null)
  const turtle = useRef<TurtleHandle | null>(null)
  const posture = useRef<PostureView | null>(null)
  /** 목 길이는 매 틱 조금씩 더하고 뺀다 (0 = 아직 재지 않음, 타이머를 걸 때 채운다) */
  const neck = useRef(0)
  const lastTick = useRef(0)

  const bubble = useRef<HTMLDivElement>(null)

  const [pet, setPet] = useState<PetState>({ mood: 'good', neck: 0 })

  useEffect(() => {
    const root = stage.current
    if (!root) return
    root.innerHTML = TURTLE_HTML
    turtle.current = runTurtle(root)
    return () => {
      turtle.current?.destroy()
      turtle.current = null
    }
  }, [])

  useEffect(() => {
    const offPosture = window.api.posture.onState((next) => {
      posture.current = next
    })
    lastTick.current = Date.now()
    const timer = setInterval(() => {
      const now = Date.now()
      const dt = now - lastTick.current
      lastTick.current = now
      const feedback = posture.current?.feedback ?? null
      const mood = moodFrom(feedback)
      // 거북목이면 '시작 시각부터 지금까지' 로 계산한다 — 판정 결과(1초 간격)에 맞추면 계단처럼 뛴다.
      // 자세가 돌아오면 틱으로 부드럽게 줄인다
      neck.current =
        mood === 'bad' && feedback?.badSince != null
          ? neckSince(feedback.badSince, now)
          : nextNeck(neck.current, mood, dt)
      const next: PetState = { mood, neck: neck.current }
      turtle.current?.setNeck(next.neck)
      setPet((prev) => (prev.mood === next.mood && prev.neck === next.neck ? prev : next))
    }, UPDATE_MS)

    return () => {
      clearInterval(timer)
      offPosture()
    }
  }, [])

  /* 말풍선은 목을 그리는 것과 같은 박자(매 프레임)로 옮긴다. React 로 다시 그리면 툭툭 끊긴다 */
  useEffect(() => {
    let frame = 0
    const follow = (): void => {
      const where = turtle.current?.getHead()
      const el = bubble.current
      if (where && el) {
        el.style.transform = `translate(${where.x}px, ${where.y - 8}px) translate(-50%, -100%)`
      }
      frame = requestAnimationFrame(follow)
    }
    frame = requestAnimationFrame(follow)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <>
      {/* 거북이는 innerHTML 로 넣으므로 React 가 그리는 것과 칸을 나눈다 */}
      <div ref={stage} className="fixed inset-0" />

      {/* 항상 거북이 머리 위. 머리를 그대로 따라가므로 화면 밖으로 나가면 같이 잘린다. */}
      {/* (발 아래는 뽀모도로 타이머 자리 — 버튼이 생기면 넣는다) */}
      {pet.mood === 'bad' && (
        <div
          ref={bubble}
          className="fixed top-0 left-0 flex w-[153px] flex-col items-center will-change-transform"
          /* 첫 프레임에 왼쪽 위에서 번쩍이지 않게. 바로 아래 rAF 가 머리 위로 옮긴다 */
          style={{ transform: 'translate(-9999px, -9999px)' }}
        >
          <div className="text-label w-full rounded-md bg-main5 p-3 text-center text-main1 shadow-card">
            목이 앞으로 나왔어요
          </div>
          <span className="-mt-1 h-4 w-3 bg-main5 [clip-path:polygon(0_0,100%_0,50%_100%)]" />
        </div>
      )}
    </>
  )
}
