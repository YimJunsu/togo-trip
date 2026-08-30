'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { EyeSlashIcon, MapTrifoldIcon } from '@phosphor-icons/react'
import {
  DartMissCard,
  DartNorthCard,
  DartResultCard,
} from '@/components/dashboard/DartResultCard'
import { DestinationCard } from '@/components/dashboard/DestinationCard'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { FilterChip } from '@/components/dashboard/FilterChip'
import { KoreaMapLayer } from '@/components/dashboard/KoreaMapLayer'
import { SkeletonBlock } from '@/components/dashboard/Skeleton'
import { listRegionAttractions } from '@/lib/attractions/actions'
import { drawDestination } from '@/lib/destinations/actions'
import type { Attraction, Destination } from '@/lib/data/types'
import { isNorthOfMdl } from '@/lib/geo/dmz'
import { PROVINCE_TO_REGION } from '@/lib/utils/labels'
import {
  aimDirectionPoint,
  clampPull,
  easeOutCubic,
  FLIGHT_MS,
  flightAngle,
  MIN_POWER,
  resolveLanding,
  rollWind,
  throwPower,
  windBow,
  type Vec,
  type Wind,
} from '@/lib/geo/dart'
import {
  koreaMap,
  unprojectPoint,
  type SigunguRegion,
} from '@/lib/geo/koreaMap'

type Mode = 'aim' | 'blind'
type Phase = 'ready' | 'aiming' | 'flying' | 'hit' | 'miss' | 'north'
type Outcome = {
  region: SigunguRegion | null
  coords: [number, number] | null
  landing: Vec
}

/** 꽂힌 시도의 여행지. 조회 실패도 'none'으로 합친다 — 다트 결과는 이미 나왔다. */
type DestinationState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'found'; destination: Destination }
  | { status: 'none' }

const { width: W, height: H, dock: DOCK } = koreaMap
/** 다트가 대기하는 곳. 지도 아래 바다 한가운데. */
const HOME: Vec = { x: W / 2, y: H - DOCK / 2 }
const GRAB_RADIUS = 120
const RING_R = 64

/**
 * 첫 바람은 서버에서 굴려 prop으로 받는다. 클라이언트에서 굴리면 서버 렌더 결과와
 * 어긋나 hydration이 깨진다. 이후 판의 바람은 reset()이 굴린다.
 */
export function DartGame({ initialWind }: { initialWind: Wind }) {
  const [mode, setMode] = useState<Mode>('aim')
  const [phase, setPhase] = useState<Phase>('ready')
  const [pull, setPull] = useState<Vec>({ x: 0, y: 0 })
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [isRevealed, setIsRevealed] = useState(false)
  const [destination, setDestination] = useState<DestinationState>({
    status: 'idle',
  })
  const [attractions, setAttractions] = useState<Attraction[] | 'pending'>(
    'pending',
  )
  const [wind, setWind] = useState<Wind>(initialWind)

  const svgRef = useRef<SVGSVGElement>(null)
  const dartRef = useRef<SVGGElement>(null)
  const grabRef = useRef<Vec>({ x: 0, y: 0 })
  const rafRef = useRef(0)
  const revealRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  /** 던질 때마다 증가. 늦게 온 여행지 응답이 새 결과를 덮지 않게 한다. */
  const throwIdRef = useRef(0)
  const hitRef = useRef<{
    ctx: CanvasRenderingContext2D
    entries: { region: SigunguRegion; path: Path2D }[]
  }>(null)

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current)
      clearTimeout(revealRef.current)
    },
    [],
  )

  function reset(nextMode?: Mode) {
    cancelAnimationFrame(rafRef.current)
    clearTimeout(revealRef.current)
    throwIdRef.current += 1
    if (nextMode) setMode(nextMode)
    setPhase('ready')
    setPull({ x: 0, y: 0 })
    setOutcome(null)
    setIsRevealed(false)
    setDestination({ status: 'idle' })
    // 다음 판의 바람. 조준하는 동안은 고정이라 보고 보정할 수 있다.
    setWind(rollWind())
  }

  function toSvg(e: React.PointerEvent): Vec {
    const rect = svgRef.current!.getBoundingClientRect()
    const scale = W / rect.width
    return {
      x: (e.clientX - rect.left) * scale,
      y: (e.clientY - rect.top) * scale,
    }
  }

  function hitTest(point: Vec): SigunguRegion | null {
    if (!hitRef.current) {
      const ctx = document.createElement('canvas').getContext('2d')
      if (!ctx) return null
      hitRef.current = {
        ctx,
        entries: koreaMap.regions.map((region) => ({
          region,
          path: new Path2D(region.path),
        })),
      }
    }
    const { ctx, entries } = hitRef.current
    for (const { region, path } of entries) {
      if (ctx.isPointInPath(path, point.x, point.y)) return region
    }
    return null
  }

  /** 꽂힌 시도의 여행지 한 곳. 화면은 repo만 알고, mock인지 관광 API인지 모른다. */
  function pickDestination(region: SigunguRegion) {
    const key = PROVINCE_TO_REGION[region.province]
    if (!key) {
      setDestination({ status: 'none' })
      return
    }
    const throwId = throwIdRef.current
    setDestination({ status: 'pending' })
    drawDestination({ region: key })
      .then((picked) => {
        if (throwId !== throwIdRef.current) return
        setDestination(
          picked
            ? { status: 'found', destination: picked }
            : { status: 'none' },
        )
      })
      .catch(() => {
        if (throwId !== throwIdRef.current) return
        setDestination({ status: 'none' })
      })
  }

  /** 꽂힌 시군구의 관광지·맛집. 미적재 지역은 서버가 그 자리에서 적재하므로 몇 초 걸릴 수 있다. */
  function pickAttractions(region: SigunguRegion) {
    const throwId = throwIdRef.current
    setAttractions('pending')
    listRegionAttractions(region.code, { limit: 5 })
      .then((rows) => {
        if (throwId !== throwIdRef.current) return
        setAttractions(rows)
      })
      .catch(() => {
        if (throwId !== throwIdRef.current) return
        setAttractions([])
      })
  }

  function land(target: Vec, chosen: SigunguRegion | null) {
    const region = chosen ?? hitTest(target)
    if (!region) {
      const [lat, lng] = unprojectPoint(target.x, target.y)
      setOutcome({ region: null, coords: null, landing: target })
      // 육지 판정이 먼저이므로 여기 오는 점은 남한 땅이 아니다. 이북인지 바다인지만 가른다.
      setPhase(isNorthOfMdl(lat, lng) ? 'north' : 'miss')
      return
    }
    // 울릉군은 인셋 박스에 그려 svg 좌표가 실좌표와 어긋난다. 이때만 지리 중심으로 표기.
    const coords =
      chosen || region.name === '울릉군'
        ? region.centroid
        : unprojectPoint(target.x, target.y)
    setOutcome({ region, coords, landing: target })
    setPhase('hit')
    pickDestination(region)
    pickAttractions(region)
    if (chosen) revealRef.current = setTimeout(() => setIsRevealed(true), 450)
  }

  function fly(
    target: Vec,
    chosen: SigunguRegion | null,
    bowWind: Wind | null,
  ) {
    setPhase('flying')
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // 모션을 끈다고 난이도가 달라지면 안 된다. 착지점은 이미 확정돼 있다.
      land(target, chosen)
      return
    }
    const angle = flightAngle(HOME, target)
    const start = performance.now()
    const frame = (now: number) => {
      const t = Math.min((now - start) / FLIGHT_MS, 1)
      const k = easeOutCubic(t)
      // 바람 쪽으로 휘어 난다. 양끝이 0이라 착지점은 흔들리지 않는다.
      const bow = bowWind ? windBow(bowWind, k) : { x: 0, y: 0 }
      const x = HOME.x + (target.x - HOME.x) * k + bow.x
      const y = HOME.y + (target.y - HOME.y) * k + bow.y
      const s = 1 + 0.55 * Math.sin(Math.PI * t) // 붕 떠올랐다 내려꽂히는 느낌
      dartRef.current?.setAttribute(
        'transform',
        `translate(${x} ${y}) rotate(${angle}) scale(${s})`,
      )
      if (t < 1) rafRef.current = requestAnimationFrame(frame)
      else land(target, chosen)
    }
    rafRef.current = requestAnimationFrame(frame)
  }

  function onPointerDown(e: React.PointerEvent) {
    if (phase === 'flying') return
    const p = toSvg(e)
    if (Math.hypot(p.x - HOME.x, p.y - HOME.y) > GRAB_RADIUS) return
    grabRef.current = p
    throwIdRef.current += 1
    setOutcome(null)
    setIsRevealed(false)
    setDestination({ status: 'idle' })
    setPull({ x: 0, y: 0 })
    setPhase('aiming')
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // 일부 브라우저는 이미 끝난 포인터에 대해 던진다. 캡처 없이도 동작한다.
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (phase !== 'aiming') return
    const p = toSvg(e)
    setPull(
      clampPull({ x: p.x - grabRef.current.x, y: p.y - grabRef.current.y }),
    )
  }

  function onPointerUp(e: React.PointerEvent) {
    if (phase !== 'aiming') return
    // state의 pull은 마지막 move보다 늦을 수 있다. 놓은 지점 기준으로 다시 계산.
    const p = toSvg(e)
    const finalPull = clampPull({
      x: p.x - grabRef.current.x,
      y: p.y - grabRef.current.y,
    })
    const power = throwPower(finalPull)
    if (power < MIN_POWER) {
      setPhase('ready')
      return
    }
    let chosen: SigunguRegion | null = null
    let target: Vec
    let bowWind: Wind | null = null
    if (mode === 'blind') {
      // 눈 가리고: 어차피 안 보이니 착지는 무작위 지역의 대표점으로 스냅한다.
      // 이미 완전 무작위라 바람·산포를 얹을 이유가 없다.
      chosen =
        koreaMap.regions[Math.floor(Math.random() * koreaMap.regions.length)]
      target = { x: chosen.anchor[0], y: chosen.anchor[1] }
    } else {
      bowWind = wind
      const raw = resolveLanding(HOME, finalPull, wind)
      target = {
        x: Math.min(Math.max(raw.x, 12), W - 12),
        y: Math.min(Math.max(raw.y, 12), H - 60),
      }
    }
    setPull({ x: 0, y: 0 })
    fly(target, chosen, bowWind)
  }

  const power = throwPower(pull)
  const isAiming = phase === 'aiming'
  /** 착지점이 아니라 조준 방향의 짧은 끝점. 어디 꽂힐지는 알려주지 않는다. */
  const aimTip = useMemo(() => aimDirectionPoint(HOME, pull), [pull])
  const isLanded = phase === 'hit' || phase === 'miss' || phase === 'north'
  const dartPos: Vec = isLanded
    ? (outcome?.landing ?? HOME)
    : isAiming
      ? { x: HOME.x + pull.x, y: HOME.y + pull.y }
      : HOME
  const dartAngle =
    isAiming && power >= MIN_POWER ? flightAngle(dartPos, aimTip) : 0
  const showResult = phase === 'hit' && (mode === 'aim' || isRevealed)
  const ringC = 2 * Math.PI * RING_R

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <FilterChip
            label="조준"
            isSelected={mode === 'aim'}
            onToggle={() => reset('aim')}
          />
          <FilterChip
            label="눈 가리고"
            isSelected={mode === 'blind'}
            onToggle={() => reset('blind')}
          />
        </div>
        {mode === 'aim' ? (
          <WindGauge wind={wind} />
        ) : (
          <p className="text-muted font-mono text-xs tracking-widest">
            시·군·구 {koreaMap.regions.length}곳
          </p>
        )}
      </div>

      <div className="bg-surface rounded-card border-line shadow-soft relative mx-auto w-full max-w-md overflow-hidden border">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full touch-none select-none"
          role="application"
          aria-label="대한민국 지도에 다트 던지기"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => phase === 'aiming' && setPhase('ready')}
        >
          <KoreaMapLayer
            highlightCode={showResult ? outcome?.region?.code : null}
          />

          {/* 파워 링: 당길수록 라임 게이지가 찬다 */}
          {isAiming && (
            <g>
              <circle
                cx={HOME.x}
                cy={HOME.y}
                r={RING_R}
                strokeWidth={7}
                className="stroke-ink/10 fill-none"
              />
              <circle
                cx={HOME.x}
                cy={HOME.y}
                r={RING_R}
                strokeWidth={7}
                strokeLinecap="round"
                strokeDasharray={`${power * ringC} ${ringC}`}
                transform={`rotate(-90 ${HOME.x} ${HOME.y})`}
                className="stroke-accent fill-none"
              />
            </g>
          )}

          {/* 조준선: 방향만 짧게. 눈 가리고 모드에서는 아예 보여주지 않는다 */}
          {isAiming && mode === 'aim' && power >= MIN_POWER && (
            <line
              x1={HOME.x}
              y1={HOME.y}
              x2={aimTip.x}
              y2={aimTip.y}
              strokeWidth={3}
              strokeDasharray="10 12"
              strokeLinecap="round"
              className="stroke-ink/30"
            />
          )}

          {/* 착지 핀 */}
          {showResult && outcome && (
            <g
              transform={`translate(${outcome.landing.x} ${outcome.landing.y})`}
              className="animate-stamp"
            >
              <circle r={22} className="fill-accent/40" />
              <circle r={9} className="fill-ink" />
            </g>
          )}

          {/* 다트. 비행 중엔 rAF가 transform을 직접 만진다 */}
          {!isLanded && (
            <g
              ref={dartRef}
              transform={`translate(${dartPos.x} ${dartPos.y}) rotate(${dartAngle})`}
              className="pointer-events-none"
            >
              <path d="M0 -36 L8 -8 L-8 -8 Z" className="fill-ink" />
              <rect
                x={-3.5}
                y={-10}
                width={7}
                height={28}
                rx={3.5}
                className="fill-ink"
              />
              <path d="M0 10 L12 30 L0 23 L-12 30 Z" className="fill-accent" />
            </g>
          )}
        </svg>

        {/* 눈 가리고: 지도만 가리고 다트 독은 남긴다 */}
        {mode === 'blind' && (
          <div
            aria-hidden={isRevealed}
            style={{ height: `${((H - DOCK) / H) * 100}%` }}
            className={`bg-ink absolute inset-x-0 top-0 flex flex-col items-center justify-center gap-2 transition-opacity duration-500 ${
              isRevealed ? 'pointer-events-none opacity-0' : 'opacity-95'
            }`}
          >
            <EyeSlashIcon size={28} className="text-paper/80" aria-hidden />
            <p className="text-paper/70 font-mono text-xs tracking-widest">
              어딘지 모르고 던지는 중
            </p>
          </div>
        )}

        {phase === 'ready' && (
          <p className="text-muted pointer-events-none absolute inset-x-0 bottom-2 text-center font-mono text-xs tracking-widest">
            다트를 잡고 당겼다 놓기
          </p>
        )}
      </div>

      {showResult && outcome?.region && outcome.coords && (
        <>
          <DartResultCard
            region={outcome.region}
            coords={outcome.coords}
            attractions={attractions}
            onRetry={() => reset()}
          />
          <DestinationSlot
            state={destination}
            province={outcome.region.province}
          />
        </>
      )}
      {phase === 'miss' && <DartMissCard onRetry={() => reset()} />}
      {phase === 'north' && <DartNorthCard onRetry={() => reset()} />}
    </div>
  )
}

/** svg 각도 기준: 0=동, +y가 아래라 시계 방향으로 남→서→북. */
const WIND_LABEL = ['동', '남동', '남', '남서', '서', '북서', '북', '북동']

/**
 * 던지기 전에 바람을 보여준다. 숨기면 왜 빗나갔는지 알 수 없어 그냥 억울해진다.
 * 보고 보정할 수 있어야 "운 반 실력 반"이 된다.
 */
function WindGauge({ wind }: { wind: Wind }) {
  const deg = (wind.angle * 180) / Math.PI
  const dir = WIND_LABEL[Math.round(wind.angle / (Math.PI / 4)) % 8]
  // 세기는 0.3~1.0 범위라 그대로 3등분하면 최저값이 0칸이 된다.
  const bars = Math.max(1, Math.ceil(((wind.strength - 0.3) / 0.7) * 3))

  return (
    <p
      className="text-muted flex items-center gap-2 font-mono text-xs tracking-widest"
      aria-label={`바람 ${dir}풍, 세기 ${bars}단계`}
    >
      <span aria-hidden>바람</span>
      <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
        <g
          transform={`rotate(${deg} 8 8)`}
          className="stroke-ink fill-none"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1={2} y1={8} x2={13} y2={8} />
          <polyline points="9,4 13,8 9,12" />
        </g>
      </svg>
      <span className="flex gap-0.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`block h-2.5 w-1 rounded-full ${
              i < bars ? 'bg-ink' : 'bg-ink/15'
            }`}
          />
        ))}
      </span>
    </p>
  )
}

/** 다트 결과 카드 아래에 붙는 여행지. 조회를 기다리느라 다트 결과가 늦어지지 않게 분리했다. */
function DestinationSlot({
  state,
  province,
}: {
  state: DestinationState
  province: string
}) {
  if (state.status === 'idle') return null

  if (state.status === 'pending') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-card border-line bg-surface animate-rise border p-6"
      >
        <span className="sr-only">여행지를 고르는 중</span>
        <SkeletonBlock className="h-4 w-1/5" />
        <SkeletonBlock className="mt-3 h-8 w-3/5" />
        <SkeletonBlock className="mt-6 h-4 w-4/5" />
      </div>
    )
  }

  if (state.status === 'none') {
    return (
      <EmptyState
        icon={MapTrifoldIcon}
        title={`${province}엔 아직 등록된 여행지가 없습니다`}
        description="다트는 잘 꽂혔어요. 이 지역으로 여행방은 만들 수 있습니다."
      />
    )
  }

  return <DestinationCard destination={state.destination} />
}
