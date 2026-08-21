'use client'

import { useState } from 'react'
import { ActionButton } from '@/components/dashboard/ActionButton'
import { TextField } from '@/components/dashboard/TextField'
import { addItineraryItem } from '@/lib/itinerary/actions'
import { MAX_MEMO_LENGTH, MAX_TITLE_LENGTH } from '@/lib/itinerary/limits'
import { formatDate } from '@/lib/utils/format'

/** 한 DAY 안에서 여는 추가 폼. 날짜는 이미 정해져 있어 입력받지 않는다. */
export function AddItineraryForm({
  tripId,
  day,
  onAdded,
  onCancel,
}: {
  tripId: string
  day: string
  /** 추가된 일정은 넘기지 않는다. 목록은 부모가 서버에서 다시 받는다. */
  onAdded: () => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [at, setAt] = useState('')
  const [memo, setMemo] = useState('')
  const [error, setError] = useState<string>()
  const [isPending, setIsPending] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return setError('무엇을 할지 적어 주세요.')

    setError(undefined)
    setIsPending(true)
    try {
      await addItineraryItem({
        tripId,
        day,
        // 시간을 비워 두면 "아직 안 정함"이다. 0시로 채우면 새벽 일정이 돼 버린다.
        at: at || null,
        title,
        memo,
      })
      onAdded()
    } catch {
      // 서버 액션의 가드(멤버십·기간·길이)가 막았거나 알 수 없는 오류다.
      setError('넣지 못했습니다. 잠시 후 다시 시도해 주세요.')
      setIsPending(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-inner border-line bg-paper animate-rise mt-3 flex flex-col gap-4 border p-4"
    >
      <TextField
        label={`${formatDate(day)}에 추가`}
        placeholder="경포해변 산책"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={MAX_TITLE_LENGTH}
      />
      <TextField
        label="시간"
        type="time"
        hint="안 정했으면 비워 두세요"
        value={at}
        onChange={(e) => setAt(e.target.value)}
      />
      <TextField
        label="메모"
        placeholder="주차는 공영주차장"
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        maxLength={MAX_MEMO_LENGTH}
        error={error}
      />

      <div className="flex gap-3">
        <ActionButton
          type="submit"
          tone="accent"
          size="sm"
          className="flex-1"
          disabled={isPending}
        >
          {isPending ? '넣는 중…' : '넣기'}
        </ActionButton>
        <ActionButton
          type="button"
          tone="quiet"
          size="sm"
          onClick={onCancel}
          disabled={isPending}
        >
          취소
        </ActionButton>
      </div>
    </form>
  )
}
