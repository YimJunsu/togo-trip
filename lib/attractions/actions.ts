'use server'

// 클라이언트 컴포넌트는 데이터 계층을 직접 import하면 안 된다 — '@/lib/data' 배럴은
// mockAuthRepo(→ node:crypto, seed 계정)까지 함께 물고 있어 그대로 import하면 브라우저
// 번들에 실려 나간다. 여기서 한 겹 감싸 서버에서만 repo를 불러 쓰게 한다.
import { attractionRepo } from '@/lib/data'
import type { Attraction } from '@/lib/data/types'
import { getTourArea } from '@/lib/geo/tourAreaMap'

/** 한 번에 돌려주는 최대 건수. 화면은 5건만 쓴다. */
const MAX_LIMIT = 30

export async function listRegionAttractions(
  code: string,
  opts?: { type?: 12 | 39; limit?: number },
): Promise<Attraction[]> {
  // 공개 서버 액션이다. 검증 없이 넘기면 아무 문자열로 read-through 적재를
  // 유발할 수 있다. 실재하는 시군구 코드인지 먼저 본다.
  if (!getTourArea(code)) return []

  const limit =
    typeof opts?.limit === 'number'
      ? Math.max(0, Math.min(opts.limit, MAX_LIMIT))
      : undefined

  return attractionRepo.listByRegion(code, { type: opts?.type, limit })
}
