'use server'

// 클라이언트 컴포넌트는 데이터 계층을 직접 import하면 안 된다 — '@/lib/data' 배럴은
// mockAuthRepo(→ node:crypto, seed 계정)까지 함께 물고 있어 그대로 import하면 브라우저
// 번들에 실려 나간다. 여기서 한 겹 감싸 서버에서만 repo를 불러 쓰게 한다.
import { attractionRepo } from '@/lib/data'
import type { Attraction } from '@/lib/data/types'

export async function listRegionAttractions(
  code: string,
  opts?: { type?: 12 | 39; limit?: number },
): Promise<Attraction[]> {
  return attractionRepo.listByRegion(code, opts)
}
