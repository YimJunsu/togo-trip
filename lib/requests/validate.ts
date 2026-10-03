import type { RequestKind } from '@/lib/data/types'
import { MAX_CONTENT_LENGTH, MIN_CONTENT_LENGTH, REQUEST_KINDS } from './limits'

/**
 * 화면과 서버 액션이 같은 함수를 부른다. 규칙을 두 곳에 적으면 반드시 갈라진다
 * (CONVENTIONS.md §5). 통과하면 다듬은 내용을, 아니면 사용자에게 보일 문구를 돌려준다.
 */
export function validateRequestContent(
  raw: string,
): { ok: true; content: string } | { ok: false; error: string } {
  const content = raw.trim()
  if (content.length < MIN_CONTENT_LENGTH) {
    return {
      ok: false,
      error: `${MIN_CONTENT_LENGTH}자 이상 적어 주세요. 무엇이 불편했는지 알아야 고칠 수 있어요.`,
    }
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    return {
      ok: false,
      error: `${MAX_CONTENT_LENGTH}자까지 넣을 수 있어요.`,
    }
  }
  return { ok: true, content }
}

export function isRequestKind(value: unknown): value is RequestKind {
  return REQUEST_KINDS.some((k) => k.value === value)
}
