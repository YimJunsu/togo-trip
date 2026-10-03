import { ChatTeardropTextIcon } from '@phosphor-icons/react/dist/ssr'
import { RequestForm } from '@/components/dashboard/RequestForm'

/**
 * 홈 아래 «요청 넣기». 제목·설명은 서버에서 그려 크롤러에게도 보이고,
 * 폼만 클라이언트다(세션이 필요해서).
 */
export function HomeRequest() {
  return (
    <section id="request" className="scroll-mt-24">
      <div className="mb-5 flex items-start gap-3">
        <ChatTeardropTextIcon
          size={24}
          className="text-accent mt-1 shrink-0"
          aria-hidden
        />
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            이런 게 있으면 좋겠어요
          </h2>
          <p className="text-muted mt-2 text-sm leading-relaxed">
            갖고 싶은 기능, 이상하게 동작한 곳, 그냥 하고 싶은 말. 무엇이든 남겨
            주세요. 운영자가 직접 읽고 다음에 만들 것을 정할 때 참고해요.
          </p>
        </div>
      </div>
      <div className="bg-surface rounded-card border-line shadow-soft border p-5 sm:p-6">
        <RequestForm />
      </div>
    </section>
  )
}
