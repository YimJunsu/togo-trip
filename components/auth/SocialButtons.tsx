import { GoogleMark, KakaoMark } from '@/components/auth/BrandMarks'
import { signInWithGoogle } from '@/lib/auth/oauth'

/**
 * 카카오·구글 자리.
 *
 * 카카오는 아직 연동 전이라 비활성이다. 구글은 Supabase Auth를 거치므로
 * mock 모드(NEXT_PUBLIC_DATA_SOURCE !== 'supabase')에서는 성립하지 않아
 * 그때도 비활성으로 둔다.
 *
 * 브랜드 색과 마크는 "강조색 하나" 원칙의 예외다. 각 회사가 규정한 것이라
 * 우리가 고를 수 없고, 없으면 사용자가 버튼을 알아보지 못한다. (DESIGN_SYSTEM §7)
 */
export function SocialButtons() {
  const googleReady = process.env.NEXT_PUBLIC_DATA_SOURCE === 'supabase'

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled
        className="bg-kakao text-ink font-display flex items-center justify-center gap-2 rounded-full py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
      >
        <KakaoMark />
        카카오로 계속하기
        <span className="text-xs font-normal opacity-70">준비 중</span>
      </button>

      {googleReady ? (
        <form action={signInWithGoogle}>
          <button
            type="submit"
            className="border-line bg-surface text-ink font-display hover:bg-paper flex w-full items-center justify-center gap-2 rounded-full border py-3 font-semibold transition duration-200 ease-out active:scale-[0.98]"
          >
            <GoogleMark />
            구글로 계속하기
          </button>
        </form>
      ) : (
        <button
          type="button"
          disabled
          className="border-line bg-surface text-ink font-display flex items-center justify-center gap-2 rounded-full border py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
        >
          <GoogleMark />
          구글로 계속하기
          <span className="text-xs font-normal opacity-70">준비 중</span>
        </button>
      )}
    </div>
  )
}
