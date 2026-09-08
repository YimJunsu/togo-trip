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

/**
 * 시트 안에 들어가는 안내. 시트 껍데기는 components/ui/Sheet.tsx가 맡는다.
 *
 * 지금 기기의 절차를 먼저 놓고 다른 기기를 아래에 접어 두지 않고 함께 보여 준다 —
 * UA 판정은 틀릴 수 있고(웹뷰·시크릿 모드), 틀렸을 때 사용자가 스스로 다른 쪽을
 * 볼 수 있어야 한다.
 */
export function InstallGuide({
  platform,
  onClose,
}: {
  platform: MobilePlatform
  onClose: () => void
}) {
  // 판정이 'other'면 둘 다 같은 비중으로 낸다.
  const order: ('ios' | 'android')[] =
    platform === 'android' ? ['android', 'ios'] : ['ios', 'android']

  return (
    <div className="flex flex-col gap-6 p-6">
      <header>
        <h2 className="font-display text-xl font-semibold tracking-tight">
          홈 화면에 추가하기
        </h2>
        <p className="text-muted mt-2 text-sm leading-relaxed">
          앱스토어에서 내려받는 앱이 아닙니다. 지금 보고 있는 이 웹페이지의
          바로가기를 홈 화면에 두는 것이라, 저장 공간을 거의 쓰지 않고 지울 때도
          아이콘만 지우면 됩니다. 추가하면 주소창 없이 앱처럼 열립니다.
        </p>
      </header>

      {order.map((key) => {
        const { device, steps } = STEPS[key]
        return (
          <section key={key}>
            <h3 className="font-display text-sm font-semibold tracking-tight">
              {device}
            </h3>
            <ol className="border-line divide-line mt-2 divide-y border-t border-b">
              {steps.map((step, i) => (
                <li key={step.label} className="flex gap-3 py-3">
                  <span
                    className="bg-accent-soft text-ink font-display flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {step.label}
                    </span>
                    {step.detail ? (
                      <span className="text-muted mt-0.5 block text-xs leading-relaxed">
                        {step.detail}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )
      })}

      <button
        type="button"
        onClick={onClose}
        className="font-display border-line hover:bg-paper w-full rounded-full border py-3 text-sm font-semibold transition duration-200"
      >
        닫기
      </button>
    </div>
  )
}
