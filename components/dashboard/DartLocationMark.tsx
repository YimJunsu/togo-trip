import { koreaMap, type SigunguRegion } from '@/lib/geo/koreaMap'

/** 실제 행정구역 경계와 대표점을 재사용해 당첨 지역의 위치를 보여 준다. */
export function DartLocationMark({ region }: { region: SigunguRegion }) {
  return (
    <svg
      viewBox={`0 0 ${koreaMap.width} ${koreaMap.height - koreaMap.dock}`}
      className="h-32 w-24 shrink-0 sm:h-40 sm:w-32"
      aria-hidden
    >
      {koreaMap.regions.map((item) => (
        <path
          key={item.code}
          d={item.path}
          className={
            item.code === region.code ? 'fill-accent' : 'fill-accent/15'
          }
        />
      ))}
      <circle
        cx={region.anchor[0]}
        cy={region.anchor[1]}
        r={koreaMap.width / 30}
        className="fill-accent/20"
      />
      <circle
        cx={region.anchor[0]}
        cy={region.anchor[1]}
        r={koreaMap.width / 65}
        className="fill-accent stroke-surface"
        strokeWidth={koreaMap.width / 250}
      />
    </svg>
  )
}
