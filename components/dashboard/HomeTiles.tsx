import Link from 'next/link'
import {
  ArrowUpRightIcon,
  CompassIcon,
  ForkKnifeIcon,
  ReceiptIcon,
} from '@phosphor-icons/react/dist/ssr'

const TOOLS = [
  {
    href: '/food',
    icon: ForkKnifeIcon,
    title: '뭐 먹을까?',
    label: '음식 뽑기',
    description: '오늘의 메뉴를 골라요',
  },
  {
    href: '/style',
    icon: CompassIcon,
    title: '어떻게 떠날까?',
    label: '여행 성향',
    description: '나와 친구의 여행 취향',
  },
  {
    href: '#travel-together',
    icon: ReceiptIcon,
    title: '얼마씩 낼까?',
    label: '여행 정산',
    description: '함께 쓴 돈을 한눈에',
  },
]

export function HomeTiles() {
  return (
    <section
      aria-label="여행을 함께 준비하는 도구"
      className="rounded-card border-line bg-surface divide-line grid divide-y border sm:grid-cols-3 sm:divide-x sm:divide-y-0"
    >
      {TOOLS.map(({ href, icon: Icon, title, label, description }) => (
        <Link
          key={href}
          href={href}
          className="group hover:bg-paper first:rounded-t-card last:rounded-b-card sm:first:rounded-l-card sm:last:rounded-r-card flex items-center gap-4 p-5 transition duration-200 sm:flex-col sm:items-start sm:gap-4"
        >
          <Icon
            size={26}
            weight="duotone"
            className="text-accent shrink-0"
            aria-hidden
          />
          <span className="min-w-0 flex-1">
            <span className="text-muted block text-xs">{label}</span>
            <span className="mt-1 flex items-center gap-2 font-semibold tracking-tight">
              {title}
              <ArrowUpRightIcon size={14} aria-hidden className="text-muted" />
            </span>
            <span className="text-muted mt-1 block text-xs leading-relaxed">
              {description}
            </span>
          </span>
        </Link>
      ))}
    </section>
  )
}
