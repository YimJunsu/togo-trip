import { NextResponse } from 'next/server'
import { pendingCutoff } from '@/lib/auth/retention'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * 온보딩을 마치지 않은 계정을 지운다.
 *
 * 구글 인증이 끝나는 순간 트리거가 profiles 행을 만든다 — 우리 동의 화면을
 * 보여주기 전이다. 구글 쪽에서 "계속"만 누르고 뒤로 가도 이름과 이메일이 남는다.
 * 개인정보처리방침 §8이 "처리 목적이 달성되면 지체 없이 파기"한다고 적고 있으므로,
 * 그 약속을 실제로 지키는 것이 이 라우트다. 보관 기간은 lib/auth/retention.ts.
 *
 * profiles만 지우면 안 된다. 인증 계정이 남아 그 사람이 다시 로그인할 때마다
 * /auth/callback의 "행이 없음" 경로(/login?error=profile)에 갇힌다. auth.users를
 * 지우면 profiles는 on delete cascade로 함께 사라진다.
 */

/**
 * 한 번에 지울 최대 인원. 삭제는 한 명씩 도는 API 호출이라 상한이 없으면
 * 어느 날 갑자기 함수 실행 시간을 넘길 수 있다. 남은 건 다음 날 이어서 지운다.
 */
const MAX_PER_RUN = 100

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  // 공개 URL이다. 시크릿이 설정돼 있지 않으면 아예 열지 않는다.
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = createSupabaseAdminClient()
  const cutoff = pendingCutoff(new Date())

  const { data: pending, error } = await admin
    .from('profiles')
    .select('id')
    .is('onboarded_at', null)
    .lt('created_at', cutoff)
    .limit(MAX_PER_RUN)

  if (error) {
    console.error('미완료 계정 조회 실패:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let deleted = 0
  let skipped = 0
  let failed = 0

  for (const row of pending ?? []) {
    // 계정 삭제는 되돌릴 수 없다. 지금은 is_onboarded() 때문에 미동의자가 여행방을
    // 만들거나 참여할 수 없어 이론상 걸릴 일이 없지만, 그 가정이 언젠가 틀렸을 때
    // 대가가 남의 여행 기록이라 확인하고 지운다.
    const { count, error: memberError } = await admin
      .from('trip_members')
      .select('trip_id', { count: 'exact', head: true })
      .eq('user_id', row.id)

    if (memberError) {
      console.error('멤버십 확인 실패:', row.id, memberError.message)
      failed += 1
      continue
    }

    if (count && count > 0) {
      // 일어나면 안 되는 조합이다. 지우지 않고 남겨 사람이 보게 한다.
      console.warn('미완료인데 여행방 멤버라 건너뜀:', row.id, `${count}건`)
      skipped += 1
      continue
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(row.id)
    if (deleteError) {
      console.error('계정 삭제 실패:', row.id, deleteError.message)
      failed += 1
      continue
    }
    deleted += 1
  }

  // 건수만 남긴다. 동의 없이 수집한 이름·이메일을 지우면서 그 값을 로그로 옮겨
  // 적으면 지운 의미가 없다. 위의 id는 조사해야 하는 이상 상황에만 찍힌다.
  console.info(`미완료 계정 정리: 삭제 ${deleted} 건너뜀 ${skipped} 실패 ${failed}`)

  return NextResponse.json({ ok: true, cutoff, deleted, skipped, failed })
}
