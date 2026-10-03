'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession } from '@/components/auth/SessionProvider'
import {
  ActionButton,
  actionButtonClass,
} from '@/components/dashboard/ActionButton'
import { FilterChip } from '@/components/dashboard/FilterChip'
import { TextArea } from '@/components/dashboard/TextArea'
import { useNotify } from '@/components/ui/Notice'
import type { RequestKind } from '@/lib/data/types'
import { submitRequest } from '@/lib/requests/actions'
import { MAX_CONTENT_LENGTH, REQUEST_KINDS } from '@/lib/requests/limits'
import { validateRequestContent } from '@/lib/requests/validate'

/**
 * 홈 «요청 넣기»의 입력부. 세션은 SessionProvider가 준다 — 여기서 서버 세션을 읽으면
 * 홈 전체가 동적 렌더링으로 떨어진다(HomeMine과 같은 이유).
 *
 * 비로그인에게는 폼 대신 로그인 문을 보여 준다. 확인 전(isLoaded=false)에는 폼 자리를
 * 비워 두어 로그인한 사람에게 «로그인하세요»가 한 박자 깜빡이지 않게 한다.
 */
export function RequestForm() {
  const { name, isLoaded } = useSession()
  const notify = useNotify()
  const [kind, setKind] = useState<RequestKind>('feature')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string>()
  const [isPending, setIsPending] = useState(false)

  if (!isLoaded) return <div className="min-h-40" aria-hidden />

  if (!name) {
    return (
      <div className="rounded-inner border-line bg-paper flex flex-col items-start gap-3 border p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted text-sm leading-relaxed">
          요청은 로그인한 회원만 보낼 수 있어요. 누가 보냈는지 알아야 답을 드릴
          수 있어서예요.
        </p>
        <Link
          href="/login"
          className={actionButtonClass({ tone: 'quiet', size: 'sm' })}
        >
          로그인하고 보내기
        </Link>
      </div>
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    // 서버 액션과 같은 함수로 거른다. 규칙을 두 곳에 적지 않는다.
    const checked = validateRequestContent(content)
    if (!checked.ok) return setError(checked.error)

    setError(undefined)
    setIsPending(true)
    try {
      await submitRequest({ kind, content: checked.content })
      setContent('')
      notify('요청을 받았어요. 고마워요!')
    } catch {
      setError('보내지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="font-display mb-2 text-sm font-medium">종류</legend>
        <div className="flex flex-wrap gap-2">
          {REQUEST_KINDS.map((k) => (
            <FilterChip
              key={k.value}
              label={k.label}
              isSelected={kind === k.value}
              onToggle={() => setKind(k.value)}
            />
          ))}
        </div>
      </fieldset>

      <TextArea
        label="내용"
        placeholder="어떤 기능이 있으면 좋을지, 어디서 막혔는지 편하게 적어 주세요."
        rows={4}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={MAX_CONTENT_LENGTH}
        hint={`${content.trim().length} / ${MAX_CONTENT_LENGTH}자`}
        error={error}
      />

      <ActionButton
        type="submit"
        tone="ink"
        className="self-start"
        disabled={isPending}
      >
        {isPending ? '보내는 중…' : '요청 보내기'}
      </ActionButton>
    </form>
  )
}
