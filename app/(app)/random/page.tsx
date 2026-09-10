import Link from 'next/link'
import { DartGame } from '@/components/dashboard/DartGame'
import { ModeTabs } from '@/components/dashboard/ModeTabs'
import { RandomDrawer } from '@/components/dashboard/RandomDrawer'
import { destinationRepo } from '@/lib/data'
import { rollWind } from '@/lib/geo/dart'
import { pageMetadata } from '@/lib/seo/metadata'

export const metadata = pageMetadata({
  title: '여행지 뽑기',
  description:
    '어디 갈지 못 정했을 때. 지도에 다트를 던지거나 조건을 걸어 국내 여행지를 무작위로 정합니다. 로그인 없이 바로 됩니다.',
  path: '/random',
})

export default async function RandomPage() {
  const candidates = await destinationRepo.list()

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            여행지 뽑기
          </h1>
          <p className="text-muted mt-1 text-sm">
            다트를 던지거나, 조건 걸고 운에 맡기세요. 국내 한정입니다.
          </p>
        </header>

        <ModeTabs
          modes={[
            {
              id: 'dart',
              label: '다트 던지기',
              panel: <DartGame initialWind={rollWind()} />,
            },
            {
              id: 'slot',
              label: '조건으로 뽑기',
              panel: <RandomDrawer initialCandidates={candidates} />,
            },
          ]}
        />
      </div>

      {/*
        서버에서 렌더되는 본문.

        예전에는 여행지 37곳과 적재된 시군구 250곳을 목록으로 깔아 이 자리를 채웠다.
        화면에는 굳이 필요 없는 나열이라 걷어냈지만, 그러면 이 페이지는 상호작용
        컴포넌트만 남아 크롤러에게 빈 껍데기가 된다 — 실제로 여행지 37건을 받고도
        본문이 263자라 어떤 검색어로도 못 뜨던 사고가 있었다. 그래서 목록 대신
        "이 화면을 어떻게 쓰는가"를 글로 적는다. 음식 뽑기가 같은 방식이다.
        (docs/SEO.md §6-3)

        지역 페이지로 걸어 들어가는 내부 링크는 이제 홈의 지도 카드가 250개 전부
        갖고 있다. 그래서 여기서 목록을 빼도 색인 경로가 끊기지 않는다.
      */}
      <section aria-labelledby="random-guide-heading">
        <h2
          id="random-guide-heading"
          className="font-display text-lg font-semibold tracking-tight"
        >
          어디 갈지 못 정했을 때, 3초 만에 정하기
        </h2>
        <div className="text-muted mt-2 flex flex-col gap-3 text-sm leading-relaxed">
          <p>
            여행 가자는 말은 했는데 어디로 갈지 정하다가 흐지부지되는 날이
            있습니다. 투고트립 여행지 뽑기는 국내 여행지를 무작위로 하나 정해
            줍니다. 회원가입도, 로그인도 필요 없고 전부 무료입니다. 해외는
            다루지 않고 <strong className="text-ink">대한민국 국내</strong>만
            뽑습니다.
          </p>
          <p>
            뽑는 방법은 두 가지입니다.{' '}
            <strong className="text-ink">다트 던지기</strong>는 대한민국 지도에
            다트를 던져 꽂힌 시·군·구가 목적지가 됩니다. 전국 {'250개 시군구'}가
            전부 과녁이고, 바람이 불기 때문에 세기와 방향을 보고 보정해야 원하는
            쪽으로 갑니다. 「조준」은 보고 던지는 모드, 「눈 가리고」는 지도를
            가린 채 던져 완전히 운에 맡기는 모드입니다. 바다나 휴전선 위에
            꽂히면 다시 던지면 됩니다.
          </p>
          <p>
            <strong className="text-ink">조건으로 뽑기</strong>는 태그를 걸고 그
            안에서만 뽑습니다. 테마는 {'바다·산·도시·힐링·액티비티'} 다섯
            가지이고, 여기에 {'예산대(가볍게·보통·넉넉하게)'}와{' '}
            {'계절(봄·여름·가을·겨울)'}을 더해 좁힐 수 있습니다. 아무것도 고르지
            않으면 후보 전체에서 하나가 나옵니다. 조건을 좁혔는데 남는 곳이
            없으면 그렇다고 알려 주니, 하나씩 풀어 가며 다시 뽑으면 됩니다.
          </p>
          <p>
            결과가 나오면 그 지역의 관광지와 맛집을 바로 이어서 보여 줍니다.
            한국 관광공사가 공개한 관광정보를 그대로 가져온 것이라 주소까지 적혀
            있고, 더 보고 싶으면 그 지역 페이지로 넘어가 전체 목록을 볼 수
            있습니다. 갈 곳이 정해졌다면 여행방을 만들어 친구를 부르고, 여행이
            끝난 뒤 쓴 돈을 넣으면 누가 누구에게 얼마를 보낼지까지 계산해
            줍니다.
          </p>
        </div>
      </section>

      <section aria-labelledby="random-more-heading">
        <h2
          id="random-more-heading"
          className="font-display text-lg font-semibold tracking-tight"
        >
          먹을 것도 못 정했다면
        </h2>
        <p className="text-muted mt-1 text-sm leading-relaxed">
          여행지를 정하고 나면 다음 고민은 늘 끼니입니다.{' '}
          <Link href="/food" className="text-ink underline underline-offset-4">
            음식 뽑기
          </Link>
          에서 종류와 컨디션을 걸어 메뉴를 뽑고, 열량·탄단지·나트륨까지 함께 볼
          수 있습니다.
        </p>
      </section>
    </div>
  )
}
