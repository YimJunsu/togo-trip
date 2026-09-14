import Link from 'next/link'
import { ArrowRightIcon, ReceiptIcon } from '@phosphor-icons/react/dist/ssr'
import { actionButtonClass } from '@/components/dashboard/ActionButton'

export function HomeTogether() {
  return (
    <section id="travel-together" className="scroll-mt-24">
      <div className="mb-5 flex items-start gap-3">
        <ReceiptIcon
          size={24}
          className="text-accent mt-1 shrink-0"
          aria-hidden
        />
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            추억은 함께, 정산은 깔끔하게
          </h2>
          <p className="text-muted mt-2 text-sm leading-relaxed">
            여행방 하나에 친구를 모으고, 함께 쓴 돈을 기록해요.
            <br className="hidden sm:block" /> 누가 누구에게 얼마를 보낼지
            계산해 드려요.
          </p>
        </div>
      </div>
      <ol className="border-line text-muted mb-5 grid grid-cols-3 gap-3 border-y py-4 text-xs sm:text-sm">
        {['여행방 만들기', '초대코드 공유', '지출 기록·정산'].map((step, i) => (
          <li key={step}>
            <span className="text-accent mb-1 block font-mono text-xs">
              0{i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/trips/new" className={actionButtonClass({ tone: 'ink' })}>
          여행방 만들기
        </Link>
        <Link href="/join" className={actionButtonClass({ tone: 'quiet' })}>
          초대코드로 참여 <ArrowRightIcon size={16} aria-hidden />
        </Link>
      </div>
      <p className="text-muted mt-3 text-xs leading-relaxed">
        여행방·정산은 로그인 후 이용해요. 운전자 할인도 반영할 수 있어요.
      </p>
    </section>
  )
}
