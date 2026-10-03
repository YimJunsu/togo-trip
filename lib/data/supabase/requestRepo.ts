import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { RequestRepository } from '../repositories'
import type { RequestKind, RequestStatus, UserRequest } from '../types'

type RequestRow = {
  id: string
  user_id: string
  author_name: string
  author_email: string
  kind: string
  content: string
  status: string
  created_at: string
  resolved_at: string | null
}

function toUserRequest(row: RequestRow): UserRequest {
  return {
    id: row.id,
    userId: row.user_id,
    authorName: row.author_name,
    authorEmail: row.author_email,
    kind: row.kind as RequestKind,
    content: row.content,
    status: row.status as RequestStatus,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  }
}

/** kind/content의 CHECK 제약 위반이 postgrest로 넘어올 때의 SQLSTATE. */
const CHECK_VIOLATION = '23514'

/**
 * 넣기는 create_request RPC(supabase/schema.sql)만 쓴다. 작성자 스냅샷을 서버가 채워야
 * 남의 이름으로 보내는 걸 막을 수 있어서 insert 정책 자체가 없다. 읽기·상태 변경은
 * 표를 직접 다루고 권한은 RLS가 본다.
 */
export const supabaseRequestRepo: RequestRepository = {
  async create(input) {
    const supabase = await createSupabaseServerClient()
    // author는 쓰지 않는다. RPC가 auth.uid()의 프로필에서 다시 꺼낸다.
    const { data, error } = await supabase
      .rpc('create_request', {
        kind_input: input.kind,
        content_input: input.content,
      })
      .single<RequestRow>()

    if (error) {
      // 앱(lib/requests/actions.ts)이 먼저 거르지만, 액션을 우회한 직접 호출은
      // DB 제약에 걸린다. 그 경우를 postgrest 오류 그대로 흘리지 않는다.
      if (error.code === CHECK_VIOLATION) {
        throw new Error('요청 내용이 너무 짧거나 깁니다.')
      }
      throw error
    }
    return toUserRequest(data)
  },

  async listAll() {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .order('created_at', { ascending: false })
      .returns<RequestRow[]>()
    if (error) throw error
    return data.map(toUserRequest)
  },

  async setStatus(id, status) {
    const supabase = await createSupabaseServerClient()
    // 관리자가 아니면 정책이 0행을 고친다 — 오류가 아니라 조용한 무동작이다.
    const { error } = await supabase
      .from('requests')
      .update({
        status,
        resolved_at: status === 'done' ? new Date().toISOString() : null,
      })
      .eq('id', id)
    if (error) throw error
  },
}
