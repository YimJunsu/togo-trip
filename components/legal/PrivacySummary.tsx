import { COLLECTED_FIELDS } from '@/lib/legal/policy'

/**
 * 수집 항목·목적·보유기간 요약.
 *
 * 가입 화면의 동의 항목과 개인정보처리방침 본문이 같은 표를 쓴다. 두 곳에 따로
 * 적으면 한쪽만 고쳐져 "동의받은 내용"과 "공개한 방침"이 어긋나게 된다.
 */
export function PrivacySummary() {
  return (
    <div>
      <ul className="divide-line border-line divide-y border-t border-b">
        {COLLECTED_FIELDS.map(({ item, purpose }) => (
          <li key={item} className="py-2.5">
            <p className="text-sm font-medium">{item}</p>
            <p className="text-muted mt-0.5 text-xs leading-relaxed">
              {purpose}
            </p>
          </li>
        ))}
      </ul>
      <p className="text-muted mt-3 text-xs leading-relaxed">
        보유·이용 기간: <strong className="text-ink font-medium">회원 탈퇴 시까지</strong>.
        탈퇴하면 지체 없이 파기합니다. 다만 관계 법령이 보관을 요구하는 기록은 그
        기간 동안 분리해 보관합니다.
      </p>
      <p className="text-muted mt-1.5 text-xs leading-relaxed">
        동의를 거부할 수 있지만, 필수 항목에 동의하지 않으면 회원가입이 되지 않습니다.
      </p>
    </div>
  )
}
