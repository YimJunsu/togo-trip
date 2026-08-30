/**
 * 일정 입력 길이 제한.
 *
 * 원본은 DB의 CHECK 제약(supabase/schema.sql, itinerary_items)이다. 여기 둔 값은
 * 그 복사본으로, 서버 액션이 사람이 읽을 수 있는 문구로 먼저 거르고 입력칸이
 * maxLength로 미리 막는 데 쓴다. 바꾸려면 스키마와 이 파일을 함께 고친다.
 *
 * 별도 파일인 이유: actions.ts는 'use server'라 async 함수 말고는 export할 수 없다.
 * (타입체크·린트는 통과하고 번들러가 잡는다.)
 */

export const MAX_TITLE_LENGTH = 60
export const MAX_MEMO_LENGTH = 500
