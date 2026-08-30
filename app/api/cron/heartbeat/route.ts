import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * Supabase 무료 플랜 정지 방지용 keepalive.
 *
 * 적재 cron(/api/cron/ingest-tour)도 쓰기를 만들지만 그쪽은 TourAPI에 의존한다.
 * 외부 API 장애나 한도 소진이 일주일 이어지면 쓰기가 0이 되어 프로젝트가 정지한다.
 * 이 라우트는 Postgres만 건드리므로 그 실패 경로를 끊는다. 중복이 아니라 보험이다.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  // 공개 URL이다. 시크릿이 설정돼 있지 않으면 아예 열지 않는다.
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = createSupabaseAdminClient()
  const beatAt = new Date().toISOString()

  // update가 아니라 upsert다. 행이 없으면 update는 0건을 고치고도 에러 없이
  // 성공을 돌려주므로, 매일 ok를 보고하면서 실제로는 아무것도 안 쓰게 된다 —
  // 이 라우트가 막으려는 바로 그 상황(7일 무활동 정지)이 조용히 벌어진다.
  const { error } = await admin
    .from('heartbeats')
    .upsert({ id: 1, beat_at: beatAt }, { onConflict: 'id' })

  if (error) {
    console.error('heartbeat 갱신 실패:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, beatAt })
}
