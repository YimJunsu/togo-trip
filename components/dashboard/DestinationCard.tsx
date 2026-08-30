import { ThemeBadge } from '@/components/dashboard/ThemeBadge'
import { Badge } from '@/components/ui/Badge'
import type { Destination } from '@/lib/data/types'
import { BUDGET_LABEL, SEASON_LABEL } from '@/lib/utils/labels'

export function DestinationCard({ destination }: { destination: Destination }) {
  return (
    <article className="rounded-card border-line bg-surface shadow-soft animate-rise overflow-hidden border">
      <div className="bg-accent text-surface flex items-end justify-between px-6 pt-5 pb-6">
        {/* 초록 위 흰 글자의 투명도 하한은 75다. 60이면 작은 글자가 3.5:1로 떨어진다. */}
        <div>
          <p className="font-mono text-xs tracking-widest opacity-75">당첨</p>
          <p className="mt-3 font-mono text-xs tracking-widest opacity-75">
            {destination.region}
          </p>
          <h2 className="font-display mt-1 text-3xl font-semibold tracking-tight">
            {destination.name}
          </h2>
        </div>
        {/* 여행지 표정은 이모지로 남긴다 — 바다·산 같은 건 아이콘보다 이게 낫다. */}
        <span className="text-4xl leading-none" aria-hidden>
          {destination.emoji}
        </span>
      </div>

      <div className="p-6">
        <p className="text-sm leading-relaxed">{destination.summary}</p>

        <ul className="mt-5 flex flex-wrap gap-1.5">
          {destination.themes.map((theme) => (
            <li key={theme}>
              <ThemeBadge theme={theme} />
            </li>
          ))}
          <li>
            <Badge className="border-line text-muted border">
              예산 {BUDGET_LABEL[destination.budget]}
            </Badge>
          </li>
          <li>
            <Badge className="border-line text-muted border">
              {destination.seasons.map((s) => SEASON_LABEL[s]).join('·')}
            </Badge>
          </li>
        </ul>
      </div>
    </article>
  )
}
