import { cn } from '@/lib/utils/cn'

/**
 * 점선 리더 한 줄. 차림표에서 메뉴와 가격을 잇는 그 선이다. (DESIGN_SYSTEM §3)
 *
 * 값 쪽만 모노다 — 메뉴판 갈래는 본문을 Pretendard로 두고 숫자에만 모노를 쓴다.
 * 티켓 전체가 모노인 보딩패스와 갈리는 지점이라 여기서 지켜야 한다.
 *
 * 점선은 span 하나가 늘어나며 그린다. 글자와 겹치지 않게 baseline보다 살짝 내린다.
 */
export function LeaderLine({
  label,
  value,
  note,
  isDim = false,
}: {
  label: string
  value: string
  /** 값 뒤에 붙는 보조 수치(기준치 %). 값보다 작고 옅게 나간다. */
  note?: string
  isDim?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-baseline gap-2 py-1.5 text-sm',
        isDim && 'opacity-45',
      )}
    >
      <span className="shrink-0">{label}</span>
      <span
        className="border-food-roast/40 min-w-6 flex-1 -translate-y-[3px] border-b border-dotted"
        aria-hidden
      />
      <span className="shrink-0 font-mono text-xs">{value}</span>
      {note ? (
        <span className="text-food-amber shrink-0 font-mono text-[10px]">
          {note}
        </span>
      ) : null}
    </div>
  )
}
