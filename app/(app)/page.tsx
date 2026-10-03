import { HomeHero } from '@/components/dashboard/HomeHero'
import { HomeMapCard } from '@/components/dashboard/HomeMapCard'
import { HomeMine } from '@/components/dashboard/HomeMine'
import { HomeRequest } from '@/components/dashboard/HomeRequest'
import { HomeTiles } from '@/components/dashboard/HomeTiles'
import { HomeTogether } from '@/components/dashboard/HomeTogether'
import { FAQ_ITEMS, SiteFaq } from '@/components/seo/SiteFaq'
import { JsonLd, faqGraph } from '@/lib/seo/JsonLd'

/** 개인 여행방만 클라이언트에서 조회해 홈의 정적 서버 렌더를 유지한다. */
export default function HomePage() {
  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <HomeMine />
      <div className="flex flex-col gap-4">
        <HomeHero />
        <HomeTiles />
      </div>
      <HomeTogether />
      <HomeMapCard />
      <HomeRequest />
      <SiteFaq />
      <JsonLd data={faqGraph([...FAQ_ITEMS])} />
    </div>
  )
}
