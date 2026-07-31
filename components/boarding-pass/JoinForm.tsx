'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import {
  InviteCodeInput,
  INVITE_CODE_LENGTH,
  normalizeInviteCode,
} from '@/components/boarding-pass/InviteCodeInput'
import { PassButton } from '@/components/boarding-pass/PassButton'
import { TripPass } from '@/components/boarding-pass/TripPass'
import { joinTripAction, type JoinFormState } from '@/lib/trips/actions'

const EMPTY: JoinFormState = {}

export function JoinForm({
  /** 초대 링크(/join?code=)로 들어온 값. 손으로 친 값과 같은 규칙으로 다듬어 채운다. */
  initialCode = '',
}: {
  initialCode?: string
}) {
  const [state, formAction, isPending] = useActionState(joinTripAction, EMPTY)
  const [code, setCode] = useState(() => normalizeInviteCode(initialCode))

  if (state.trip) {
    return (
      <div className="flex flex-col gap-5">
        <TripPass trip={state.trip} stampLabel="BOARDED" isStampAnimated />
        <Link
          href={`/trips/${state.trip.id}`}
          className="bg-pass-navy text-pass-cream rounded-pass px-5 py-3 text-center font-mono text-sm tracking-widest"
        >
          여행방 들어가기
        </Link>
      </div>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <InviteCodeInput value={code} onChange={setCode} error={state.message} />
      {/* InviteCodeInput은 name을 받지 않는다. 값만 따로 실어 보낸다. */}
      <input type="hidden" name="code" value={code} />
      <PassButton
        type="submit"
        disabled={code.length < INVITE_CODE_LENGTH || isPending}
      >
        {isPending ? 'CHECKING…' : 'BOARDING'}
      </PassButton>
    </form>
  )
}
