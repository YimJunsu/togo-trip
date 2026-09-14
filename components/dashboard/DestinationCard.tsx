import { ThemeBadge } from '@/components/dashboard/ThemeBadge'
import { Badge } from '@/components/ui/Badge'
import type { Destination } from '@/lib/data/types'
import { BUDGET_LABEL, SEASON_LABEL } from '@/lib/utils/labels'

export function DestinationCard({
  destination,
  eyebrow = '이번 여행은 여기로',
}: {
  destination: Destination
  eyebrow?: string
}) {
  return (
    <article className="rounded-card border-line bg-surface shadow-soft animate-rise overflow-hidden border">
      <div className="border-line flex items-end justify-between gap-4 border-b px-6 pt-5 pb-6">
        <div>
          <p className="text-accent text-xs font-semibold">{eyebrow}</p>
          <p className="text-muted mt-4 text-sm">{destination.region}</p>
          <h2 className="font-display mt-1 text-3xl font-bold tracking-tight">
            {destination.name}
          </h2>
        </div>
        {/* 여행지 표정은 이모지로 남긴다 — 바다·산 같은 건 아이콘보다 이게 낫다. */}
        <span
          className="bg-accent-soft/50 rounded-inner flex size-16 shrink-0 items-center justify-center text-3xl leading-none"
          aria-hidden
        >
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
