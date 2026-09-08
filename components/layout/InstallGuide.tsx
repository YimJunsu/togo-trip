import type { MobilePlatform } from '@/lib/pwa/install'

type Step = { label: string; detail?: string }

/**
 * 기기별 홈 화면 추가 절차.
 *
 * 문구는 각 OS가 화면에 실제로 쓰는 말을 그대로 옮겼다. "공유 버튼"처럼 풀어 쓰면
 * 사용자가 어느 아이콘인지 못 찾는다 — 메뉴 이름과 글자가 같아야 눈으로 대조된다.
 */
const STEPS: Record<'ios' | 'android', { device: string; steps: Step[] }> = {
  ios: {
    device: 'iPhone · iPad (Safari)',
    steps: [
      {
        label: '아래쪽 가운데 공유 버튼을 누릅니다',
        detail: '네모에서 화살표가 위로 나가는 모양이에요.',
      },
      { label: '목록을 내려 «홈 화면에 추가»를 누릅니다' },
      { label: '오른쪽 위 «추가»를 누르면 끝납니다' },
    ],
  },
  android: {
    device: 'Android (Chrome)',
    steps: [
      {
        label: '오른쪽 위 «⋮» 버튼을 누릅니다',
        detail: '점 세 개가 세로로 있는 메뉴예요.',
      },
      {
        label: '«홈 화면에 추가» 또는 «앱 설치»를 누릅니다',
        detail: '크롬 버전에 따라 둘 중 하나로 보입니다.',
      },
      { label: '«설치»를 한 번 더 누르면 끝납니다' },
    ],
  },
}

function StepList({ device }: { device: 'ios' | 'android' }) {
  const { steps } = STEPS[device]
  return (
    <ol className="border-line divide-line divide-y border-t border-b">
      {steps.map((step, i) => (
        <li key={step.label} className="flex gap-3 py-3">
          <span
            className="bg-accent-soft text-ink font-display flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
            aria-hidden
          >
            {i + 1}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium">{step.label}</span>
            {step.detail ? (
              <span className="text-muted mt-0.5 block text-xs leading-relaxed">
                {step.detail}
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ol>
  )
}

/**
 * 시트 안에 들어가는 안내. 시트 껍데기는 components/ui/Sheet.tsx가 맡는다.
 *
 * 높이를 화면의 80%로 묶고 안에서 스크롤한다. 시트가 하단 정렬(mt-auto)이라 내용이
 * 화면보다 길면 위로 넘쳐 제목이 화면 밖으로 나가고 닫기 버튼만 보였다 — 실제로
 * 폰에서 그렇게 나왔다.
 *
 * 지금 기기의 절차만 펼쳐 두고 다른 기기는 접어 둔다. 둘 다 펼치면 폰 화면에서
 * 스크롤해야 자기 것이 보인다. 그래도 접어서 남겨 두는 이유는 UA 판정이 웹뷰·시크릿
 * 모드에서 틀릴 수 있고, 틀렸을 때 사용자가 스스로 다른 쪽을 찾을 수 있어야 해서다.
 */
export function InstallGuide({
  platform,
  onClose,
}: {
  platform: MobilePlatform
  onClose: () => void
}) {
  const primary: 'ios' | 'android' = platform === 'android' ? 'android' : 'ios'
  const secondary: 'ios' | 'android' = primary === 'android' ? 'ios' : 'android'

  return (
    <div className="flex max-h-[80dvh] flex-col gap-4 overflow-y-auto p-5">
      <header>
        <h2 className="font-display text-xl font-semibold tracking-tight">
          홈 화면에 추가하기
        </h2>
        <p className="text-muted mt-1.5 text-sm leading-relaxed">
          앱스토어에서 받는 앱이 아닙니다. 이 페이지의 바로가기를 홈 화면에 두는
          것이라 저장 공간을 거의 쓰지 않고, 지울 때도 아이콘만 지우면 됩니다.
        </p>
      </header>

      <section>
        <h3 className="font-display text-sm font-semibold tracking-tight">
          {STEPS[primary].device}
        </h3>
        <div className="mt-2">
          <StepList device={primary} />
        </div>
      </section>

      <details className="group">
        <summary className="text-muted hover:text-ink flex cursor-pointer list-none items-center justify-between gap-2 py-1 text-sm font-medium">
          {STEPS[secondary].device}는 이렇게 합니다
          <span
            aria-hidden
            className="shrink-0 transition duration-200 group-open:rotate-45"
          >
            +
          </span>
        </summary>
        <div className="mt-2">
          <StepList device={secondary} />
        </div>
      </details>

      <button
        type="button"
        onClick={onClose}
        className="font-display border-line hover:bg-paper w-full shrink-0 rounded-full border py-3 text-sm font-semibold transition duration-200"
      >
        닫기
      </button>
    </div>
  )
}
