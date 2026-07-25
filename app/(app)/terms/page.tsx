import Link from 'next/link'
import {
  LegalLayout,
  LegalList,
  LegalSection,
} from '@/components/legal/LegalLayout'
import { MIN_SIGNUP_AGE, OPERATOR, POLICY_EFFECTIVE_DATE } from '@/lib/legal/policy'
import { pageMetadata } from '@/lib/seo/metadata'
import { SITE_NAME } from '@/lib/seo/site'

export const metadata = pageMetadata({
  title: '이용약관',
  description: `${SITE_NAME} 서비스 이용 조건과 회원의 권리·의무를 안내합니다.`,
  path: '/terms',
})

export default function TermsPage() {
  return (
    <LegalLayout
      title="이용약관"
      effectiveDate={POLICY_EFFECTIVE_DATE}
      intro={`${SITE_NAME}(이하 "서비스")을 이용하기 전에 아래 내용을 확인해 주세요. 회원가입 시 이 약관에 동의한 것으로 봅니다.`}
    >
      <LegalSection heading="제1조 (목적)">
        <p className="text-muted">
          이 약관은 서비스가 제공하는 국내여행 계획·정산 기능의 이용 조건과 절차,
          운영자와 회원의 권리·의무를 정하는 것을 목적으로 합니다.
        </p>
      </LegalSection>

      <LegalSection heading="제2조 (서비스의 내용)">
        <p className="text-muted">
          서비스는 아래 기능을 제공합니다. 기능은 운영상 필요에 따라 추가·변경될 수
          있습니다.
        </p>
        <LegalList
          items={[
            '국내 여행지 무작위 추천 (로그인 불필요)',
            '여행 성향 분석 및 여행 궁합 테스트 (로그인 불필요)',
            '초대코드 기반 여행방 생성 및 참여 (로그인 필요)',
            '여행 경비 기록 및 엔빵 정산 (로그인 필요)',
          ]}
        />
        <p className="text-muted">
          서비스는 현재 무료로 제공됩니다.
          {/*
            TODO(운영): 유료 기능(예: 사진 보정 건당 결제)을 도입하려면 이 약관만
            고쳐서는 안 된다. 대가를 받고 재화·용역을 파는 순간 전자상거래법이
            적용되어 사업자등록과 통신판매업 신고가 필요하고, 청약철회·환불 규정,
            결제대행사 위탁 고지, 사업자 정보 표시 의무가 함께 따라온다.
            개인 운영 상태 그대로 결제를 받으면 안 된다.
          */}
        </p>
      </LegalSection>

      <LegalSection heading="제3조 (회원가입)">
        <p className="text-muted">
          회원가입은 이 약관과 개인정보 수집·이용에 동의하고 가입 양식을 작성하면
          완료됩니다. 만 {MIN_SIGNUP_AGE}세 미만은 가입할 수 없습니다.
        </p>
        <p className="text-muted">
          회원은 사실에 맞는 정보를 입력해야 하며, 타인의 정보를 도용해서는 안
          됩니다.
        </p>
      </LegalSection>

      <LegalSection heading="제4조 (계정 관리)">
        <p className="text-muted">
          계정과 비밀번호의 관리 책임은 회원에게 있습니다. 계정이 도용된 것을 알게
          되면 즉시 운영자에게 알려 주세요.
        </p>
      </LegalSection>

      <LegalSection heading="제5조 (회원의 의무)">
        <p className="text-muted">회원은 아래 행위를 해서는 안 됩니다.</p>
        <LegalList
          items={[
            '타인의 정보를 도용하거나 허위 정보를 등록하는 행위',
            '서비스의 정상적인 운영을 방해하는 행위',
            '다른 회원을 모욕하거나 권리를 침해하는 내용을 등록하는 행위',
            '자동화된 수단으로 서비스에 과도한 부하를 일으키는 행위',
            '법령이나 공서양속에 반하는 행위',
          ]}
        />
      </LegalSection>

      <LegalSection heading="제6조 (정산 기능에 관한 고지)">
        <p className="text-muted">
          정산 기능은 회원이 입력한 금액을 계산해 보여 주는 도구일 뿐이며, 실제
          송금이나 결제를 대행하지 않습니다. 계산 결과에 따른 회원 간 금전 거래는
          당사자 사이의 문제이고, 운영자는 이에 관여하거나 책임지지 않습니다.
        </p>
      </LegalSection>

      <LegalSection heading="제7조 (여행 정보의 한계)">
        <p className="text-muted">
          서비스가 제공하는 여행지 정보, 성향 분석, 궁합 결과는 참고와 재미를 위한
          것입니다. 과학적·전문적 진단이 아니며 정확성을 보장하지 않습니다. 실제
          여행 계획은 회원 판단과 책임으로 결정해 주세요.
        </p>
      </LegalSection>

      <LegalSection heading="제8조 (서비스의 중단)">
        <p className="text-muted">
          점검, 설비 장애, 천재지변 등으로 서비스 제공이 어려운 경우 일시적으로
          중단될 수 있습니다. 예정된 점검은 사전에 알립니다.
        </p>
        <p className="text-muted">
          운영자는 서비스를 종료할 수 있으며, 이 경우 최소 30일 전에 알리고 회원
          데이터 처리 방법을 함께 안내합니다.
        </p>
      </LegalSection>

      <LegalSection heading="제9조 (이용 제한 및 탈퇴)">
        <p className="text-muted">
          회원이 제5조를 위반하면 운영자는 사전 통지 후 이용을 제한하거나 계정을
          삭제할 수 있습니다. 긴급한 경우에는 먼저 조치한 뒤 알립니다.
        </p>
        <p className="text-muted">
          회원은 언제든지 탈퇴할 수 있으며, 탈퇴하면 개인정보는{' '}
          <Link href="/privacy" className="text-ink font-medium underline">
            개인정보처리방침
          </Link>
          에 따라 파기됩니다.
        </p>
      </LegalSection>

      <LegalSection heading="제10조 (책임의 한계)">
        <p className="text-muted">
          운영자는 무료로 제공되는 서비스의 이용과 관련하여 회원에게 발생한 손해에
          대해, 운영자의 고의 또는 중대한 과실이 없는 한 책임지지 않습니다.
        </p>
        <p className="text-muted">
          회원이 등록한 내용이나 회원 간 분쟁에 대해서는 운영자가 책임지지 않습니다.
        </p>
      </LegalSection>

      <LegalSection heading="제11조 (약관의 변경)">
        <p className="text-muted">
          약관을 변경할 때는 시행일 최소 7일 전부터 서비스 내 공지로 알립니다.
          회원에게 불리한 변경은 30일 전에 알리며, 회원이 변경에 동의하지 않으면
          탈퇴할 수 있습니다.
        </p>
      </LegalSection>

      <LegalSection heading="제12조 (문의)">
        <p className="text-muted">
          서비스 이용에 관한 문의는 {OPERATOR.email} 으로 보내 주세요.
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
