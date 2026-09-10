import { koreaMap } from '@/lib/geo/koreaMap'
import { terrainGrade, type TerrainGrade } from '@/lib/geo/terrain'
import { cn } from '@/lib/utils/cn'

/**
 * 시군구 지도 레이어. DartGame의 svg 안에서 쓴다.
 *
 * 지형이 읽히도록 지도 전용 팔레트로 칠한다 — 바다·평야·구릉·산지.
 * 이 팔레트는 지도 svg 안으로 범위가 한정된 예외다. (DESIGN_SYSTEM §6)
 * 명중 지역만 라임이라 자연색 위에서 오히려 더 튄다.
 */
const GRADE_FILL: Record<TerrainGrade, string> = {
  low: 'fill-terrain-low',
  mid: 'fill-terrain-mid',
  high: 'fill-terrain-high',
}

export function KoreaMapLayer({
  highlightCode,
  linkRegions = false,
}: {
  highlightCode?: string | null
  /**
   * 각 지역을 `/region/{code}`로 걸어 준다. 홈의 지도 카드가 쓴다 —
   * 거기서는 지도가 그림이 아니라 250개 시군구로 들어가는 목차다.
   *
   * next/link가 아니라 평범한 `<a>`인 것은 의도다. Link는 화면에 들어온 링크를
   * 미리 받아 두는데, 여기서는 그게 홈을 열자마자 라우트 250개를 프리페치하는
   * 뜻이 된다. 지도는 눌러 보는 사람이 소수라 그 값이 전부 낭비다.
   */
  linkRegions?: boolean
}) {
  return (
    <g>
      {/* 바다. 아래로 갈수록 깊어져 다트가 대기하는 독이 먼바다로 읽힌다. */}
      <defs>
        <linearGradient id="terrain-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className="[stop-color:var(--color-terrain-sea)]" />
          <stop
            offset="100%"
            className="[stop-color:var(--color-terrain-sea-deep)]"
          />
        </linearGradient>
      </defs>
      <rect
        x={0}
        y={0}
        width={koreaMap.width}
        height={koreaMap.height}
        fill="url(#terrain-sea)"
      />

      {koreaMap.regions.map((region) => {
        const isHit = region.code === highlightCode
        const shapeClass = cn(
          'stroke-surface transition-[fill] duration-300',
          isHit
            ? 'fill-map-hit'
            : GRADE_FILL[terrainGrade(region.province, region.name)],
          // 누를 수 있을 때만 손끝을 따라 색이 바뀐다. (DESIGN_SYSTEM §2)
          linkRegions &&
            'group-hover:fill-accent-soft group-focus-visible:fill-accent-soft',
        )

        if (!linkRegions) {
          return (
            <path
              key={region.code}
              d={region.path}
              className={shapeClass}
              strokeWidth={1}
            />
          )
        }

        return (
          // 이름은 aria-label로 준다. 도형만 있는 링크는 스크린리더에 이름 없는
          // 링크로 읽힌다. svg <title>을 쓰면 안 된다 — React 19가 <title>을 문서
          // 메타데이터로 보고 끌어올려서, svg 안에 빈 <title>만 250개 남는다.
          <a
            key={region.code}
            href={`/region/${region.code}`}
            aria-label={`${region.name} 가볼만한 곳`}
            className="group outline-none"
          >
            <path d={region.path} className={shapeClass} strokeWidth={1} />
          </a>
        )
      })}

      {/* 울릉도·독도 인셋. 본토에서 떨어져 있어 박스로 옮겨 그린다. */}
      {koreaMap.insets.map((inset) => (
        <g key={inset.label}>
          <rect
            x={inset.x}
            y={inset.y}
            width={inset.w}
            height={inset.h}
            rx={10}
            strokeDasharray="4 4"
            // line 토큰은 바다색과 명도가 거의 같아 안 보인다. 먹색을 옅게 쓴다.
            className="stroke-ink/25 fill-none"
          />
          <text
            x={inset.x + inset.w / 2}
            y={inset.y + inset.h + 14}
            textAnchor="middle"
            className="fill-ink/55 font-mono text-[11px]"
          >
            {inset.label}
          </text>
        </g>
      ))}
    </g>
  )
}
