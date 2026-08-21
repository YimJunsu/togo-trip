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
}: {
  highlightCode?: string | null
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
        return (
          <path
            key={region.code}
            d={region.path}
            className={cn(
              'stroke-surface transition-[fill] duration-300',
              isHit
                ? 'fill-map-hit'
                : GRADE_FILL[terrainGrade(region.province, region.name)],
            )}
            strokeWidth={1}
          />
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
