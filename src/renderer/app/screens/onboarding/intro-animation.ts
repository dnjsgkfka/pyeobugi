/* eslint-disable */
// @ts-nocheck -- 디자이너가 준 스크립트를 그대로 둔다 (타입을 입히면 원본과 비교가 어려워진다)
// 시작 화면 애니메이션. root 안에서만 동작하고, 화면이 남색으로 덮이면 onStart() 를 부른다.
// 돌려받은 함수를 호출하면 타이머와 애니메이션이 멈춘다.
export function runIntroAnimation(root: HTMLElement, onStart: () => void): () => void {
  const $ = (s) => root.querySelector(s)
  const stage = $('#stage'),
    frame = $('#frame')
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const D = (ms) => (reduce ? Math.min(ms, 180) : ms) // 모션 줄이기 설정 시 짧은 페이드만
  const F = { fill: 'forwards' }
  const EASE_OUT = 'cubic-bezier(.22,1,.36,1)'
  const EASE_INOUT = 'cubic-bezier(.76,0,.24,1)'
  let stageName = 'loading',
    timers = []

  // 화면 크기에 맞춰 1280×832 무대를 축소/확대
  function fit() {
    // 배경이 꽉 차야 하는 그림이라, 비율은 지키되 담긴 영역을 덮도록 키운다
    // (맞춰 넣으면 창 비율에 따라 양옆이나 위아래에 여백이 생긴다)
    const w = root.clientWidth,
      h = root.clientHeight
    if (!w || !h) return
    const s = Math.max(w / 1280, h / 832)
    frame.style.width = w + 'px'
    frame.style.height = h + 'px'
    stage.style.transform = `translate(${(w - 1280 * s) / 2}px, ${(h - 832 * s) / 2}px) scale(${s})`
  }
  const observer = new ResizeObserver(fit)
  observer.observe(root)
  fit()

  const anim = (sel, kf, opt) => $(sel).animate(kf, Object.assign({}, F, opt))
  const wait = (ms) => new Promise((r) => timers.push(setTimeout(r, ms)))

  // ── 1. 로딩 ──────────────────────────────
  function playLoading() {
    stageName = 'loading'
    wakeTurtle(false)
    if (!reduce)
      root.querySelectorAll('#loadingText .dot').forEach((d, i) => {
        d.animate([{ opacity: 0.15 }, { opacity: 1 }, { opacity: 0.15 }], {
          duration: 1100,
          delay: i * 140,
          iterations: Infinity
        })
      })
    anim(
      '#bigLogo',
      [
        { opacity: 0, transform: 'translateY(16px)' },
        { opacity: 1, transform: 'none' }
      ],
      { duration: D(700), easing: EASE_OUT }
    )
    return wait(reduce ? 900 : 2300)
  }

  // ── 2. 노트북이 올라오며 시작하기 멘트 ─────────
  async function playRise() {
    stageName = 'rising'
    anim(
      '#bigLogo',
      [
        { opacity: 1, transform: 'none' },
        { opacity: 0, transform: 'translateY(-90px)' }
      ],
      { duration: D(650), easing: 'cubic-bezier(.55,0,.75,.4)' }
    )
    anim('#loadingText', [{ opacity: 1 }, { opacity: 0 }], { duration: D(220) })
    anim(
      '#laptop',
      reduce
        ? [
            { transform: 'translateY(293px)', opacity: 0.0 },
            { transform: 'translateY(0)', opacity: 1 }
          ]
        : [
            { transform: 'translateY(293px)' },
            { transform: 'translateY(-12px)', offset: 0.72 },
            { transform: 'translateY(0)' }
          ],
      { duration: D(1000), delay: D(120), easing: EASE_OUT }
    )
    ;[...root.querySelectorAll('#startContent > *')].forEach((el, i) => {
      el.animate(
        [
          { opacity: 0, transform: 'translateY(10px)' },
          { opacity: 1, transform: 'none' }
        ],
        Object.assign({}, F, { duration: D(500), delay: D(620 + i * 90), easing: EASE_OUT })
      )
    })
    // 거북이는 처음부터 노트북에 걸친 채 함께 올라오고, 착지할 때 살짝 눌렸다 펴짐
    await wait(D(1000))
    if (!reduce)
      ['#turtleBody', '#turtleFront'].forEach((sel) =>
        $(sel).animate(
          [
            { transform: 'scale(1)' },
            { transform: 'scale(1.03,.95)', offset: 0.4 },
            { transform: 'scale(1)' }
          ],
          { duration: 380, easing: 'ease-out' }
        )
      )
    await wait(D(240))
    wakeTurtle(true, true)
    stageName = 'start'
    $('#startContent').style.pointerEvents = 'auto'
    $('#startBtn').tabIndex = 0
  }

  // ── 거북이 행동: 눈 깜빡임 · 두리번 · 머리 털기 · 지느러미 톡톡 · 숨쉬기 ──
  const T = {
    head: $('#turtleFront .t-head'),
    look: $('#turtleFront .t-look'),
    blink: $('#turtleFront .t-blink'),
    closed: $('#turtleFront .t-closed'),
    flL: $('#turtleFront .t-fl-l'),
    flR: $('#turtleFront .t-fl-r'),
    bodies: [$('#turtleFront .t-flips'), $('#turtleBody .t-body')],
    shell: $('#turtleBody .t-shell'),
    bob: $('#turtleFront .t-headbob')
  }
  const rand = (a, b) => a + Math.random() * (b - a)
  const running = new Map()
  let brain = 0 // 실행 세대 (다시 보기/화면 전환 시 이전 루프 중단)
  let attention = false,
    eyesShut = false

  // 현재 자세에서 목표 자세로 부드럽게 이동하고 그 자세를 유지
  async function pose(el, transform, dur, easing = 'cubic-bezier(.45,0,.25,1)') {
    const prev = running.get(el)
    if (prev) {
      try {
        prev.commitStyles()
      } catch (e) {}
      prev.cancel()
    }
    const from = getComputedStyle(el).transform
    const a = el.animate([{ transform: from === 'none' ? 'none' : from }, { transform }], {
      duration: dur,
      easing,
      fill: 'forwards'
    })
    running.set(el, a)
    try {
      await a.finished
      a.commitStyles()
      a.cancel()
    } catch (e) {}
    if (running.get(el) === a) running.delete(el)
  }
  const play = (el, kf, opt) => el.animate(kf, opt).finished.catch(() => {})
  const nap = (ms, gen) => new Promise((r) => setTimeout(r, ms)).then(() => gen === brain)

  // 눈 깜빡임 (가끔 두 번 연속)
  async function blinkOnce() {
    if (eyesShut) return
    await play(
      T.blink,
      [
        { transform: 'scaleY(1)' },
        { transform: 'scaleY(.08)', offset: 0.45 },
        { transform: 'scaleY(.08)', offset: 0.55 },
        { transform: 'scaleY(1)' }
      ],
      { duration: 170, easing: 'ease-in-out' }
    )
  }
  async function blinkLoop(gen) {
    while (await nap(rand(2200, 5200), gen)) {
      await blinkOnce()
      if (Math.random() < 0.22) {
        await nap(90, gen)
        await blinkOnce()
      }
    }
  }

  // 숨쉬기: 등껍질이 아주 살짝 부풀었다 가라앉음
  function breathe() {
    T.shell.animate(
      [
        { transform: 'scale(1,1)' },
        { transform: 'scale(1.015,1.03)' },
        { transform: 'scale(1,1)' }
      ],
      { duration: 3200, iterations: Infinity, easing: 'ease-in-out' }
    )
    T.bob.animate(
      [
        { transform: 'translateY(0)' },
        { transform: 'translateY(-1.5px)' },
        { transform: 'translateY(0)' }
      ],
      { duration: 3200, iterations: Infinity, easing: 'ease-in-out' }
    )
  }

  // 두리번: 머리를 돌리면 눈이 머리보다 더 많이 움직여 고개를 돌린 느낌
  function lookPose(dx, dy = 0) {
    if (eyesShut || following) return Promise.resolve()
    return Promise.all([
      pose(T.head, `translate(${dx * 7}px, ${dy * 3}px) rotate(${dx * 6}deg)`, 380),
      pose(T.look, `translate(${dx * 15}px, ${dy * 9}px) scale(${1 - Math.abs(dx) * 0.08}, 1)`, 340)
    ])
  }
  async function lookAround(gen) {
    const first = Math.random() < 0.5 ? -1 : 1
    await lookPose(first, rand(-0.3, 0.4))
    if (!(await nap(rand(700, 1200), gen)) || attention) return
    if (Math.random() < 0.5) await blinkOnce()
    await lookPose(-first, rand(-0.3, 0.4))
    if (!(await nap(rand(700, 1200), gen)) || attention) return
    await lookPose(0)
  }

  // 머리 털기: 눈을 질끈 감고 좌우로 털다가 잦아듦
  async function shake(gen) {
    if (eyesShut) return
    eyesShut = true
    await pose(T.look, 'none', 160)
    T.blink.style.opacity = 0
    T.closed.style.opacity = 1
    const kf = [
      { transform: 'rotate(0) translateX(0)' },
      { transform: 'rotate(-14deg) translateX(-10px)', offset: 0.1 },
      { transform: 'rotate(14deg) translateX(10px)', offset: 0.24 },
      { transform: 'rotate(-11deg) translateX(-8px)', offset: 0.38 },
      { transform: 'rotate(8deg) translateX(5px)', offset: 0.52 },
      { transform: 'rotate(-4deg) translateX(-3px)', offset: 0.66 },
      { transform: 'rotate(1.5deg) translateX(1px)', offset: 0.8 },
      { transform: 'rotate(0) translateX(0)' }
    ]
    await pose(T.head, 'none', 120)
    const jig = [
      { transform: 'rotate(0)' },
      { transform: 'rotate(1.6deg)', offset: 0.12 },
      { transform: 'rotate(-1.6deg)', offset: 0.26 },
      { transform: 'rotate(1.1deg)', offset: 0.4 },
      { transform: 'rotate(-.8deg)', offset: 0.54 },
      { transform: 'rotate(.3deg)', offset: 0.7 },
      { transform: 'rotate(0)' }
    ]
    jig.forEach((k) => (k.easing = 'ease-in-out'))
    T.bodies.forEach((b) => b.animate(jig, { duration: 950, easing: 'linear' }))
    // WAAPI의 easing 옵션은 전체 구간에 걸리므로, 구간마다 easing을 줘야 CSS 키프레임처럼 매 흔들림이 또렷함
    kf.forEach((k) => (k.easing = 'ease-in-out'))
    await play(T.head, kf, { duration: 950, easing: 'linear' })
    await nap(140, gen)
    T.closed.style.opacity = 0
    T.blink.style.opacity = ''
    eyesShut = false
    await play(T.blink, [{ transform: 'scaleY(.1)' }, { transform: 'scaleY(1)' }], {
      duration: 160,
      easing: 'ease-out'
    })
  }

  // 반갑다고 인사: 오른쪽 지느러미를 들어 흔들고, 눈을 활짝 웃으며 고개를 갸우뚱
  async function wave(gen) {
    eyesShut = true
    await Promise.all([
      pose(T.look, 'none', 160),
      pose(T.head, 'translate(5px, -3px) rotate(6deg)', 320)
    ])
    T.blink.style.opacity = 0
    T.closed.style.opacity = 1
    // 흔드는 동안 지느러미를 머리 앞으로 꺼내고, 어깨를 축으로 바깥을 향해 들어 올림
    const flips = T.flR.ownerSVGElement
    flips.style.zIndex = 2
    flips.parentNode.style.isolation = 'isolate'
    const kf = [
      { transform: 'translate(0,0) rotate(0deg)' },
      { transform: 'translate(50px,-6px) rotate(-128deg)', offset: 0.18 },
      { transform: 'translate(50px,-6px) rotate(-98deg)', offset: 0.3 },
      { transform: 'translate(50px,-6px) rotate(-134deg)', offset: 0.42 },
      { transform: 'translate(50px,-6px) rotate(-98deg)', offset: 0.54 },
      { transform: 'translate(50px,-6px) rotate(-134deg)', offset: 0.66 },
      { transform: 'translate(50px,-6px) rotate(-110deg)', offset: 0.78 },
      { transform: 'translate(0,0) rotate(0deg)' }
    ]
    kf.forEach((k) => (k.easing = 'ease-in-out'))
    const hop = [
      { transform: 'translateY(0)' },
      { transform: 'translateY(-5px)', offset: 0.18 },
      { transform: 'translateY(-5px)', offset: 0.78 },
      { transform: 'translateY(0)' }
    ]
    hop.forEach((k) => (k.easing = 'ease-in-out'))
    T.bob.animate(hop, { duration: 1800, easing: 'linear', composite: 'add' })
    await play(T.flR, kf, { duration: 1800, easing: 'linear' })
    flips.style.zIndex = ''
    T.closed.style.opacity = 0
    T.blink.style.opacity = ''
    eyesShut = false
    play(T.blink, [{ transform: 'scaleY(.1)' }, { transform: 'scaleY(1)' }], {
      duration: 160,
      easing: 'ease-out'
    })
    if (gen === brain) await pose(T.head, 'none', 360)
  }

  // 지느러미로 노트북 모서리를 톡톡
  async function tap() {
    const el = Math.random() < 0.5 ? T.flL : T.flR,
      s = el === T.flL ? 1 : -1
    const kf = [
      { transform: 'rotate(0)' },
      { transform: `rotate(${-9 * s}deg)`, offset: 0.25 },
      { transform: 'rotate(0)', offset: 0.5 },
      { transform: `rotate(${-7 * s}deg)`, offset: 0.72 },
      { transform: 'rotate(0)' }
    ]
    kf.forEach((k) => (k.easing = 'ease-in-out'))
    await play(el, kf, { duration: 560, easing: 'linear' })
  }

  let lastAct = 'shake'
  async function idleLoop(gen) {
    while (await nap(rand(1100, 2600), gen)) {
      if (attention) continue
      // 두리번이 주된 행동, 머리 털기는 가끔(연속으로는 안 함)
      const r = Math.random()
      if (r < 0.6) {
        await lookAround(gen)
        lastAct = 'look'
      } else if (r < 0.68 && lastAct !== 'shake') {
        await shake(gen)
        lastAct = 'shake'
      } else if (r < 0.84) {
        await tap()
        lastAct = 'tap'
      } else lastAct = 'rest'
      // 나머지: 가만히 숨만 쉼
    }
  }

  function wakeTurtle(firstShake, keepBreath) {
    const gen = ++brain
    if (reduce) return
    if (!keepBreath) breathe()
    blinkLoop(gen)
    ;(async () => {
      // 노트북이 착지하면 손 흔들며 인사, 로딩 중에는 두리번거리며 기다림
      if (firstShake) {
        if (await nap(150, gen)) await wave(gen)
        lastAct = 'wave'
      } else if (await nap(600, gen)) {
        await lookAround(gen)
        lastAct = 'look'
      }
      idleLoop(gen)
    })()
  }
  function sleepTurtle() {
    brain++
    attention = false
    eyesShut = false
    following = false
    running.forEach((a) => a.cancel())
    running.clear()
    ;[T.head, T.look, T.blink, T.closed, T.flL, T.flR, ...T.bodies, T.shell].forEach((el) => {
      el.style.transform = ''
      el.style.opacity = ''
      el.getAnimations().forEach((a) => a.cancel())
    })
    T.bob.getAnimations().forEach((a) => a.cancel())
  }

  // 키보드로 시작하기에 포커스가 가면 거북이가 버튼을 내려다봄
  // (마우스는 커서 따라보기가 자연스럽게 버튼을 보게 하므로 별도 동작 없음)
  let watching = false
  function watchButton() {
    if (stageName !== 'start' || reduce || eyesShut || following) return
    if (!$('#startBtn').matches(':focus-visible')) return
    watching = true
    attention = true
    pose(T.head, 'translate(-5px, 4px) rotate(-5deg)', 320)
    pose(T.look, 'translate(-13px, 12px) scale(.94, 1)', 300)
  }
  function unwatchButton() {
    if (!watching) return
    watching = false
    attention = false
    lookPose(0)
  }
  $('#startBtn').addEventListener('focus', watchButton)
  $('#startBtn').addEventListener('blur', unwatchButton)

  // ── 마우스 커서를 따라 고개를 돌림. 2.5초간 움직임이 없으면 혼자 두리번 ──
  let following = false,
    lastMove = 0,
    aim = { x: 0, y: 0 },
    cur = { x: 0, y: 0 }
  const ACTIVE = () => stageName === 'loading' || stageName === 'rising' || stageName === 'start'
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
  window.addEventListener('pointermove', (e) => {
    if (reduce || !ACTIVE()) return
    const r = $('#turtleFront').getBoundingClientRect()
    const hx = r.left + r.width * 0.5,
      hy = r.top + r.height * 0.54 // 눈 사이
    const s = r.width / 420
    aim.x = clamp((e.clientX - hx) / (420 * s), -1, 1)
    aim.y = clamp((e.clientY - hy) / (320 * s), -1, 1)
    lastMove = performance.now()
    if (!following) {
      following = true
      attention = true
      ;[T.head, T.look].forEach((el) => {
        const a = running.get(el)
        if (a) {
          try {
            a.commitStyles()
          } catch (_) {}
          a.cancel()
          running.delete(el)
        }
      })
      const m = new DOMMatrix(
        getComputedStyle(T.look).transform === 'none'
          ? undefined
          : getComputedStyle(T.look).transform
      )
      cur.x = clamp(m.e / 15, -1, 1)
      cur.y = clamp(m.f / 9, -1, 1)
    }
  })
  ;(function followLoop() {
    requestAnimationFrame(followLoop)
    if (!following) return
    if (!ACTIVE() || performance.now() - lastMove > 2500) {
      following = false
      attention = false // 가만히 있으면 혼자 움직이는 모드로
      return
    }
    if (eyesShut) return // 머리 털기·인사 중에는 잠시 멈춤
    cur.x += (aim.x - cur.x) * 0.14
    cur.y += (aim.y - cur.y) * 0.14
    T.head.style.transform = `translate(${cur.x * 7}px, ${cur.y * 4}px) rotate(${cur.x * 6}deg)`
    T.look.style.transform = `translate(${cur.x * 15}px, ${cur.y * 10}px) scale(${1 - Math.abs(cur.x) * 0.08}, 1)`
  })()

  // ── 거북이를 클릭하면 머리 털기 ──
  function poke() {
    if (reduce || !ACTIVE() || eyesShut) return
    shake(brain)
  }
  $('#turtleFront .t-head').addEventListener('click', poke)
  $('#turtleFront .t-flips').addEventListener('click', poke)

  // ── 3. 노트북 화면이 확장되며 권한 요청으로 ────────
  async function playExpand() {
    if (stageName !== 'start') return
    stageName = 'expanding'
    brain++
    attention = false
    $('#startBtn').tabIndex = -1
    $('#startContent').style.pointerEvents = 'none'
    // 버튼 눌림
    $('#startBtn').animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(.96)' }, { transform: 'scale(1)' }],
      { duration: D(200) }
    )
    // 거북이는 노트북 모서리에 걸친 채, 커지는 화면과 함께 위로 밀려 나감
    await wait(D(160))
    const dur = D(950)
    const PUSH = 407 // 화면 윗변이 올라가는 거리(257 → -150)
    // 화면이 커지는 앞부분에서 글씨가 사라짐
    anim('#startContent', [{ opacity: 1 }, { opacity: 0 }], {
      duration: dur * 0.45,
      easing: 'ease-out'
    })
    const GROW = 1316 / 1034
    ;['#turtleFront', '#turtleBody'].forEach((sel) =>
      anim(
        sel,
        [
          { transform: 'translateY(0) scale(1)' },
          { transform: `translateY(${-PUSH}px) scale(${GROW})` }
        ],
        { duration: dur, easing: EASE_INOUT }
      )
    )
    // 노치도 윗변에 붙어 함께 화면 밖으로
    anim('#notch', [{ transform: 'translateY(0)' }, { transform: 'translateY(-24px)' }], {
      duration: dur,
      easing: EASE_INOUT
    })
    // 화면이 커져 무대를 꽉 채우고, 베젤은 가장자리 밖으로 밀려남
    await anim(
      '#screen',
      [
        { left: '123px', top: '257px', width: '1034px', height: '686px' },
        { left: '-18px', top: '-150px', width: '1316px', height: '1000px' }
      ],
      { duration: dur, easing: EASE_INOUT }
    ).finished
    // 꽉 찬 화면 전체가 서서히 남색으로 물듦 → 여기서 권한 화면으로 넘어간다
    await anim('#screenFill', [{ opacity: 0 }, { opacity: 1 }], {
      duration: D(900),
      easing: 'cubic-bezier(.4,0,.2,1)'
    }).finished
    stageName = 'permission'
    onStart()
  }
  $('#startBtn').addEventListener('click', playExpand)

  function reset() {
    timers.forEach(clearTimeout)
    timers = []
    sleepTurtle()
    root.getAnimations({ subtree: true }).forEach((a) => a.cancel())
    $('#startContent').style.pointerEvents = 'none'
    $('#startBtn').tabIndex = -1
  }
  async function run() {
    reset()
    await playLoading()
    await playRise()
  }
  document.fonts.ready.then(run)
  // 화면을 떠날 때 타이머와 애니메이션을 모두 멈춘다
  return () => {
    timers.forEach(clearTimeout)
    sleepTurtle()
    observer.disconnect()
  }
}
