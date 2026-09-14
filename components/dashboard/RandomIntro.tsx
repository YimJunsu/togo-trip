import Image from 'next/image'
import { TargetIcon } from '@phosphor-icons/react/dist/ssr'

export function RandomIntro() {
  return (
    <header className="flex items-center justify-between gap-4">
      <div>
        <p className="text-accent mb-3 flex items-center gap-2 text-xs font-semibold">
          <TargetIcon size={16} aria-hidden />
          여행지 뽑기
        </p>
        <h1 className="font-display text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
          계획에 없던 곳이,
          <br />
          <span className="text-accent">다음 여행이 되는 순간.</span>
        </h1>
        <p className="text-muted mt-3 text-sm leading-relaxed">
          다트 한 번으로 시작하는 국내 여행.
          <br className="sm:hidden" /> 마음에 드는 곳이면, 그곳부터 둘러봐요.
        </p>
      </div>
      <Image
        src="/images/mascot.webp"
        alt=""
        width={112}
        height={112}
        className="hidden size-28 shrink-0 sm:block"
      />
    </header>
  )
}
