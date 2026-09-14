import Image from 'next/image'
import Link from 'next/link'
import { ArrowRightIcon, TargetIcon } from '@phosphor-icons/react/dist/ssr'
import { actionButtonClass } from '@/components/dashboard/ActionButton'

export function HomeHero() {
  return (
    <section className="rounded-card border-line bg-surface relative overflow-hidden border px-6 py-7 sm:p-8">
      <p className="text-accent mb-4 flex items-center gap-2 text-sm font-semibold">
        <TargetIcon size={18} weight="bold" aria-hidden />
        다음 여행의 시작, 다트 한 번
      </p>
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
          어디로 갈까?
          <br />
          <span className="text-accent">일단, 던져볼까.</span>
        </h1>
        <Image
          src="/images/mascot.webp"
          alt=""
          width={144}
          height={144}
          className="size-16 shrink-0 sm:size-36"
          preload
        />
      </div>
      <p className="text-muted mt-4 max-w-sm text-sm leading-relaxed text-pretty">
        뜻밖의 여행지, 맛있는 한 끼.
        <br />
        어디 갈지부터 함께 쓴 돈까지, 가볍게 정해요.
      </p>
      <Link
        href="/random"
        className={actionButtonClass({
          tone: 'accent',
          className: 'mt-6 min-h-12 w-full sm:w-auto',
        })}
      >
        다트로 여행지 뽑기{' '}
        <ArrowRightIcon size={18} weight="bold" aria-hidden />
      </Link>
      <p className="text-muted mt-3 text-xs">
        국내 여행지 추천 · 로그인 없이 바로 시작
      </p>
    </section>
  )
}
