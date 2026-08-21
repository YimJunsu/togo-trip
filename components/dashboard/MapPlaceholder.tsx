import type { Place } from '@/lib/data/types'

/**
 * 지도 자리. Kakao Local API를 붙이기 전까지, 좌표를 실제 범위에 맞춰 정규화해
 * 상대 위치만 찍어 둔다. 지도는 아니지만 어디가 어디쯤인지는 보인다.
 */
export function MapPlaceholder({ places }: { places: Place[] }) {
  const lats = places.map((p) => p.lat)
  const lngs = places.map((p) => p.lng)
  const bounds = {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  }
  /** 마커가 가장자리에 붙지 않도록 안쪽으로 밀어 넣는 여백(%). */
  const PAD = 10
  const span = (min: number, max: number, v: number) =>
    max === min ? 50 : PAD + ((v - min) / (max - min)) * (100 - PAD * 2)

  return (
    <div className="rounded-card bg-ink relative h-60 overflow-hidden">
      <p className="text-paper/40 absolute top-4 left-5 font-mono text-xs tracking-widest">
        MAP · 준비 중
      </p>

      {places.map((place) => (
        <span
          key={place.id}
          title={place.name}
          style={{
            left: `${span(bounds.minLng, bounds.maxLng, place.lng)}%`,
            top: `${100 - span(bounds.minLat, bounds.maxLat, place.lat)}%`,
          }}
          className={`absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ${
            place.isChakan
              ? 'bg-accent ring-accent/25 ring-4'
              : 'bg-paper/35 ring-paper/10 ring-2'
          }`}
        >
          <span className="sr-only">
            {place.name}
            {place.isChakan ? ' (착한가격업소)' : ''}
          </span>
        </span>
      ))}

      <div className="bg-ink/60 text-paper absolute right-4 bottom-4 rounded-full px-3 py-1.5 text-xs backdrop-blur-sm">
        <span className="flex items-center gap-1.5">
          <span className="bg-accent h-2 w-2 rounded-full" aria-hidden />
          착한식당
          <span className="text-paper/30">·</span>
          <span className="bg-paper/35 h-2 w-2 rounded-full" aria-hidden />
          일반
        </span>
      </div>
    </div>
  )
}
