import type { RequestKind } from '@/lib/data/types'

/**
 * 요청 내용 길이. supabase/schema.sql의 requests.content CHECK와 같은 값이다 —
 * 한쪽을 바꾸면 같이 바꾼다. 최소 10자는 "ㅇㅇ" 같은 한 글자 요청을 거르려는 것이다.
 */
export const MIN_CONTENT_LENGTH = 10
export const MAX_CONTENT_LENGTH = 1000

/** 화면의 종류 선택 칩과 관리 화면의 배지가 같이 쓴다. 순서가 곧 칩 순서다. */
export const REQUEST_KINDS: readonly { value: RequestKind; label: string }[] = [
  { value: 'feature', label: '기능 제안' },
  { value: 'bug', label: '오류 신고' },
  { value: 'other', label: '기타' },
]

export const REQUEST_KIND_LABEL: Record<RequestKind, string> = {
  feature: '기능 제안',
  bug: '오류 신고',
  other: '기타',
}
