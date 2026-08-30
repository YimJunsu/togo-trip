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

  const { error } = await admin
    .from('heartbeats')
    .update({ beat_at: beatAt })
    .eq('id', 1)

  if (error) {
    console.error('heartbeat 갱신 실패:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, beatAt })
}
