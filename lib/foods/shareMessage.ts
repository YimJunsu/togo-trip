import { withJosa } from '@/lib/utils/josa'

export type ShareTone = 'casual' | 'polite'

export const SHARE_TONE_LABEL: Record<ShareTone, string> = {
  casual: '반말',
  polite: '존댓말',
}

export const SHARE_TONE_ORDER: readonly ShareTone[] = ['casual', 'polite']

/**
 * 공유 문구. 같은 메뉴라도 보낼 상대에 따라 말투가 달라야 해서 톤을 고르게 한다.
 *
 * 반말 쪽은 조사가 필요하다 — "김밥나 먹으러 가자"가 되면 문장이 깨진다.
 * 받침 판정은 lib/utils/josa.ts가 이미 갖고 있으므로 여기서 다시 만들지 않는다.
 */
export function shareMessage(name: string, tone: ShareTone): string {
  if (tone === 'casual') {
    return `야! ${withJosa(name, '이나/나')} 먹으러 가자!!`
  }
  return `오늘 ${name} 어떠신가요?`
}
