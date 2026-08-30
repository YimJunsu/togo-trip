import type { Attraction } from '@/lib/data/types'

/**
 * 관광지·맛집 목록. 다트 결과 카드와 지역 페이지가 함께 쓴다.
 *
 * 항목이 세로로 이어지므로 카드를 쌓지 않고 하나의 카드 안에서 구분선으로 나눈다.
 * (DESIGN_SYSTEM §2) 정보만 담은 목록이라 호버에 반응하지 않는다.
 */
export function AttractionList({
  items,
  emptyText,
}: {
  items: Attraction[]
  emptyText: string
}) {
  if (items.length === 0) {
    return <p className="text-muted text-sm">{emptyText}</p>
  }

  return (
    <ul className="rounded-inner border-line divide-line divide-y border">
      {items.map((item) => (
        <li key={item.contentId} className="px-4 py-3 text-left">
          <p className="font-display text-sm font-semibold tracking-tight">
            {item.title}
          </p>
          {item.addr && <p className="text-muted mt-0.5 text-xs">{item.addr}</p>}
          {item.overview && (
            <p className="text-muted mt-1.5 text-xs leading-relaxed">
              {excerpt(item.overview)}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}

/** overview는 관공서 문체라 길다. 지역 페이지 본문 분량은 150자 × 5건으로 잡혀 있다. */
export function excerpt(text: string, max = 150): string {
  return text.length <= max ? text : `${text.slice(0, max).trimEnd()}…`
}
