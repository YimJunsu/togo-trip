'use client'

import { useRef, useState } from 'react'
import { ActionButton } from '@/components/dashboard/ActionButton'
import { FilterChip } from '@/components/dashboard/FilterChip'
import { TextField } from '@/components/dashboard/TextField'
import { addExpense } from '@/lib/expenses/actions'
import { MAX_EXPENSE_DESCRIPTION, parseWon } from '@/lib/expenses/validate'
import type { Member } from '@/lib/data/types'
import { formatWon } from '@/lib/utils/format'

const CATEGORIES = ['교통', '숙박', '식비', '카페', '간식', '기타'] as const

export function AddExpenseForm({
  tripId,
  members,
  currentUserId,
  onAdded,
  onCancel,
}: {
  tripId: string
  members: Member[]
  /**
   * 결제자 기본값. 지출은 대개 결제한 본인이 바로 넣는다. 예전에는 첫 멤버(방장)가
   * 기본값이라, 멤버가 넣은 지출이 방장 결제로 잘못 들어가는 일이 잦았다.
   */
  currentUserId: string
  /** 추가된 지출은 넘기지 않는다. 목록은 부모가 서버에서 다시 받는다. */
  onAdded: () => void
  onCancel: () => void
}) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [payerId, setPayerId] = useState(
    members.some((m) => m.userId === currentUserId)
      ? currentUserId
      : (members[0]?.userId ?? ''),
  )
  const [participantIds, setParticipantIds] = useState(
    members.map((m) => m.userId),
  )
  const [category, setCategory] = useState<string>(CATEGORIES[0])
  const [error, setError] = useState<string>()
  // 응답을 기다리는 동안 "넣기"를 다시 누르면 같은 지출이 두 번 들어갔다.
  // state만으로는 못 막는다 — 다시 그려지기 전의 연타는 모두 false를 본다(실측 3연타 → 3건).
  // 판정은 ref로 하고, state는 버튼 모양만 바꾼다.
  const submittingRef = useRef(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const parsed = parseWon(amount)
  const perPerson =
    parsed.ok && participantIds.length > 0
      ? parsed.won / participantIds.length
      : null

  function toggleParticipant(id: string) {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (submittingRef.current) return
    if (!description.trim()) return setError('뭘 샀는지 적어 주세요.')
    if (!parsed.ok) return setError(parsed.message)
    if (participantIds.length === 0)
      return setError('나눠 낼 사람을 한 명 이상 골라 주세요.')

    setError(undefined)
    submittingRef.current = true
    setIsSubmitting(true)
    try {
      await addExpense({
        tripId,
        payerId,
        amount: parsed.won,
        description,
        category,
        participantIds,
      })
      onAdded()
    } catch {
      // 서버 액션의 가드(멤버십·검증)가 막았거나 알 수 없는 오류다. 버튼이 조용히
      // 아무 반응 없는 상태로 남지 않도록 기존 에러 표시 자리에 띄운다.
      setError('추가하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-card border-line bg-surface shadow-soft animate-rise flex flex-col gap-5 border p-5"
    >
      <TextField
        label="뭘 샀나"
        placeholder="주문진 회센터 저녁"
        value={description}
        maxLength={MAX_EXPENSE_DESCRIPTION}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div>
        {/* type="number"는 쉼표를 못 받고, 휠·화살표로 값이 조용히 바뀐다. */}
        <TextField
          label="얼마"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="152,000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={error}
        />
        {parsed.ok ? (
          <p className="text-muted mt-2 text-xs tabular-nums" aria-live="polite">
            {formatWon(parsed.won)}
            {perPerson !== null
              ? ` · ${participantIds.length}명이면 1인 약 ${formatWon(Math.round(perPerson))}`
              : ''}
          </p>
        ) : null}
      </div>

      <ChipGroup label="결제한 사람">
        {members.map((m) => (
          <FilterChip
            key={m.userId}
            label={m.displayName}
            isSelected={payerId === m.userId}
            onToggle={() => setPayerId(m.userId)}
          />
        ))}
      </ChipGroup>

      <ChipGroup label="나눠 낼 사람">
        {members.map((m) => (
          <FilterChip
            key={m.userId}
            label={m.displayName}
            isSelected={participantIds.includes(m.userId)}
            onToggle={() => toggleParticipant(m.userId)}
          />
        ))}
      </ChipGroup>

      <ChipGroup label="분류">
        {CATEGORIES.map((c) => (
          <FilterChip
            key={c}
            label={c}
            isSelected={category === c}
            onToggle={() => setCategory(c)}
          />
        ))}
      </ChipGroup>

      <div className="flex gap-3">
        <ActionButton
          type="submit"
          tone="accent"
          className="flex-1"
          disabled={isSubmitting}
        >
          {isSubmitting ? '넣는 중…' : '넣기'}
        </ActionButton>
        <ActionButton type="button" tone="quiet" onClick={onCancel}>
          취소
        </ActionButton>
      </div>
    </form>
  )
}

function ChipGroup({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <fieldset>
      <legend className="text-muted mb-2 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  )
}
