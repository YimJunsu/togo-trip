import {
  LegalLayout,
  LegalList,
  LegalSection,
} from '@/components/legal/LegalLayout'
import { PrivacySummary } from '@/components/legal/PrivacySummary'
import {
  AUTO_COLLECTED,
  MIN_SIGNUP_AGE,
  OPERATOR,
  PENDING_ACCOUNT_RETENTION_TEXT,
  POLICY_EFFECTIVE_DATE,
  PROCESSORS,
} from '@/lib/legal/policy'
import { pageMetadata } from '@/lib/seo/metadata'
import { SITE_NAME } from '@/lib/seo/site'

export const metadata = pageMetadata({
  title: '개인정보처리방침',
  description: `${SITE_NAME}이 어떤 개인정보를 무엇을 위해 수집하고 얼마나 보관하는지, 이용자가 어떤 권리를 행사할 수 있는지 안내합니다.`,
  path: '/privacy',
})

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="개인정보처리방침"
      effectiveDate={POLICY_EFFECTIVE_DATE}
      intro={`${SITE_NAME}은 이용자의 개인정보를 소중히 다루며, 개인정보 보호법 등 관계 법령을 지킵니다. 이 방침은 어떤 정보를 왜 수집하고 어떻게 다루는지 알리기 위한 것입니다.`}
    >
      <LegalSection heading="1. 수집하는 항목과 이용 목적">
        <p className="text-muted">
          회원가입 시 아래 항목을 수집합니다. 모두 필수 항목이며, 동의하지 않으면
          가입이 되지 않습니다.
        </p>
        <PrivacySummary />
      </LegalSection>

      <LegalSection heading="2. 자동으로 수집되는 정보">
        <p className="text-muted">
          서비스를 이용하는 과정에서 아래 정보가 자동으로 만들어지거나 수집될 수
          있습니다.
        </p>
        <LegalList items={AUTO_COLLECTED} />
      </LegalSection>

      <LegalSection heading="3. 보유 및 이용 기간">
        <p className="text-muted">
          회원 탈퇴 시까지 보유하며, 탈퇴하면 지체 없이 파기합니다. 다만 관계
          법령이 별도 보관을 요구하는 경우 그 기간 동안 다른 정보와 분리해
          보관합니다.
        </p>
        <p className="text-muted">
          소셜 로그인은 인증이 끝나는 시점에 이름과 이메일이 먼저 전달됩니다.
          이어지는 가입 절차(생년월일 확인과 약관 동의)를 마치지 않은 계정은
          가입이 완료되지 않은 것으로 보아 {PENDING_ACCOUNT_RETENTION_TEXT} 안에
          모두 삭제합니다. 만 {MIN_SIGNUP_AGE}세 미만이어서 가입이 제한된 경우도
          같습니다.
        </p>
        <p className="text-muted">
          접속 로그는 통신비밀보호법에 따라 3개월간 보관합니다.
        </p>
      </LegalSection>

      <LegalSection heading="4. 처리위탁">
        <p className="text-muted">
          서비스 운영을 위해 아래 업체에 개인정보 처리를 위탁하고 있습니다.
          회원 데이터베이스는 국내(서울) 리전에 저장됩니다.
        </p>
        <ul className="divide-line border-line divide-y border-t border-b">
          {PROCESSORS.map(({ name, task, note }) => (
            <li key={name} className="py-2.5">
              <p className="text-sm font-medium">{name}</p>
              <p className="text-muted mt-0.5 text-xs leading-relaxed">
                {task} · {note}
              </p>
            </li>
          ))}
        </ul>
      </LegalSection>

      <LegalSection heading="5. 제3자 제공">
        <p className="text-muted">
          이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만 법령에 따라
          수사기관 등이 적법한 절차로 요구하는 경우에는 그에 따릅니다.
        </p>
      </LegalSection>

      <LegalSection heading="6. 쿠키와 맞춤형 광고">
        <p className="text-muted">
          로그인 상태를 유지하기 위해 쿠키를 사용합니다. 이 쿠키를 차단하면
          로그인이 필요한 기능을 쓸 수 없습니다.
        </p>
        <p className="text-muted">
          {/*
            TODO(운영): 애드센스를 실제로 붙이는 시점에 이 문단을 확인한다.
            광고를 달지 않은 채로 "게재합니다"라고 적어 두면 그것도 사실과 다르다.
          */}
          서비스에 광고를 게재하는 경우, 광고 사업자가 쿠키와 광고 식별자를 이용해
          이용자의 관심에 맞는 광고를 보여 줄 수 있습니다. 맞춤형 광고는 브라우저
          설정이나 광고 사업자가 제공하는 설정 페이지에서 거부할 수 있습니다.
        </p>
        <p className="text-muted">
          숙소·여행 상품 등 제휴 링크를 통해 이동한 경우, 이동한 사이트의 정보
          처리에는 그 사이트의 방침이 적용됩니다. 이 링크로 발생한 거래에 대해
          운영자가 수수료를 받을 수 있습니다.
        </p>
      </LegalSection>

      <LegalSection heading="7. 이용자의 권리">
        <p className="text-muted">
          이용자는 언제든지 자신의 개인정보에 대해 열람, 정정, 삭제, 처리정지를
          요구할 수 있습니다. 아래 연락처로 요청하시면 지체 없이 처리합니다.
        </p>
        <p className="text-muted">
          법정대리인은 만 {MIN_SIGNUP_AGE}세 미만 아동을 대리해 같은 권리를 행사할
          수 있습니다. 다만 이 서비스는 만 {MIN_SIGNUP_AGE}세 미만의 가입을 받지
          않습니다.
        </p>
      </LegalSection>

      <LegalSection heading="8. 파기 절차와 방법">
        <p className="text-muted">
          보유 기간이 지나거나 처리 목적이 달성되면 지체 없이 파기합니다. 전자적
          파일은 복구할 수 없는 방법으로 삭제하고, 출력물이 있는 경우 분쇄하거나
          소각합니다. 가입을 마치지 않은 계정의 삭제는 매일 자동으로 이루어집니다.
        </p>
      </LegalSection>

      <LegalSection heading="9. 안전성 확보 조치">
        <LegalList
          items={[
            '비밀번호는 복호화할 수 없는 형태로 암호화해 저장합니다.',
            '데이터베이스에 행 수준 접근 제어를 적용해, 이용자는 자신의 정보만 조회할 수 있습니다.',
            '모든 통신은 HTTPS로 암호화합니다.',
            '개인정보를 다루는 인원을 운영자 본인으로 최소화합니다.',
          ]}
        />
      </LegalSection>

      <LegalSection heading="10. 개인정보 보호책임자">
        <p className="text-muted">
          개인정보 처리에 관한 문의, 불만, 피해 구제는 아래로 연락해 주세요.
        </p>
        <ul className="text-muted flex flex-col gap-1">
          <li>운영 형태: {OPERATOR.type}</li>
          <li>책임자: {OPERATOR.name}</li>
          <li>연락처: {OPERATOR.email}</li>
        </ul>
        <p className="text-muted">
          그 밖의 개인정보 침해에 대한 신고·상담은 개인정보침해신고센터(국번없이
          118), 대검찰청 사이버수사과(1301), 경찰청 사이버수사국(182)에 문의할 수
          있습니다.
        </p>
      </LegalSection>

      <LegalSection heading="11. 방침의 변경">
        <p className="text-muted">
          이 방침을 변경할 때는 시행일 최소 7일 전부터 서비스 내 공지로 알립니다.
          이용자에게 불리한 변경은 30일 전에 알립니다.
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
