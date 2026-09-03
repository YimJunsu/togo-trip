'use client'

import { useMemo, useState } from 'react'
import { CaretDown } from '@phosphor-icons/react'
import { DateWheel } from '@/components/auth/DateWheel'
import { Sheet } from '@/components/ui/Sheet'
import { Field } from '@/components/ui/Field'
import {
  clampDay,
  daysInMonth,
  selectableYears,
  toIso,
} from '@/lib/utils/birthDate'

/**
 * 생년월일 입력. 닫혀 있을 때는 이웃 입력칸과 같은 행이고, 누르면 휠 시트가 열린다.
 *
 * 네이티브 <input type="date">를 쓰지 않는 이유는 그대로다 — 달력의 기본값이
 * 올해라 생일까지 30년을 거슬러 넘겨야 하고, 생김새를 브라우저가 정해 우리 화면과
 * 따로 논다. 휠은 연도를 한 번에 굴려 지나갈 수 있다.
 *
 * 밖으로 나가는 것은 예나 지금이나 name="birthDate"의 YYYY-MM-DD 하나뿐이다.
 * 폼도 검증도 이 파일 안이 어떻게 생겼는지 몰라야 한다.
 */

type Parts = { year: number; month: number; day: number }

/**
 * 값이 없을 때 휠이 서 있는 자리. 굴리지 않고 완료를 누르면 이 날짜가 들어간다 —
 * iOS와 같은 동작이고, 완료를 누른 것 자체가 확인이다. 눈에 띄게 임의의 값이라
 * 실수로 자기 생일이라고 착각할 여지가 적다.
 */
const ANCHOR: Parts = { year: 2000, month: 1, day: 1 }

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

export function BirthDateField({ error }: { error?: string }) {
  const years = useMemo(() => selectableYears(new Date()), [])

  /** 확정된 값. null이면 아직 고르지 않았다. */
  const [value, setValue] = useState<Parts | null>(null)
  /** 시트 안에서 굴리는 중인 값. 완료를 눌러야 value가 된다. */
  const [draft, setDraft] = useState<Parts>(ANCHOR)
  const [isOpen, setIsOpen] = useState(false)

  const days = useMemo(
    () =>
      Array.from(
        { length: daysInMonth(draft.year, draft.month) },
        (_, i) => i + 1,
      ),
    [draft.year, draft.month],
  )

  /** 연·월이 바뀌어 사라진 날짜를 그때마다 당긴다. 2월 30일이 만들어질 자리가 없다. */
  function patch(next: Partial<Parts>) {
    setDraft((prev) => {
      const merged = { ...prev, ...next }
      return { ...merged, day: clampDay(merged.year, merged.month, merged.day) }
    })
  }

  function open() {
    // 열 때마다 확정값에서 시작한다. 지난번에 굴리다 만 자리가 남지 않는다.
    setDraft(value ?? ANCHOR)
    setIsOpen(true)
  }

  function confirm() {
    setValue(draft)
    setIsOpen(false)
  }

  return (
    <>
      <Field
        label="생년월일"
        error={error}
        className="gap-0.5"
        labelClassName="text-muted font-display text-xs font-semibold tracking-wide"
        errorClassName="text-danger font-normal"
      >
        {(props) => (
          <>
            {/*
              <label htmlFor>이 이 버튼을 가리킨다. button은 labelable 요소라
              라벨을 눌러도 시트가 열린다 — 이웃 입력칸과 같은 감각이다.
            */}
            <button
              {...props}
              type="button"
              onClick={open}
              className="flex w-full items-center justify-between bg-transparent py-1 text-left text-[15px] outline-none"
            >
              <span className={value ? 'text-ink' : 'text-muted/50'}>
                {value
                  ? `${value.year}년 ${value.month}월 ${value.day}일`
                  : '생년월일을 선택하세요'}
              </span>
              <CaretDown
                size={12}
                weight="bold"
                aria-hidden
                className="text-muted shrink-0"
              />
            </button>

            <input
              type="hidden"
              name="birthDate"
              value={value ? toIso(value.year, value.month, value.day) : ''}
            />
          </>
        )}
      </Field>

      <Sheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        label="생년월일 선택"
      >
        {/*
          type="button"을 빼면 안 된다. 이 시트는 가입 폼 <form> 안에 있어서
          기본 type인 submit이 그대로 폼을 보내 버린다.
        */}
        <header className="border-line flex items-center justify-between border-b px-2 py-2">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-muted hover:text-ink rounded-full px-3 py-1.5 text-sm transition duration-200"
          >
            취소
          </button>
          <span className="font-display text-sm font-semibold">생년월일</span>
          <button
            type="button"
            onClick={confirm}
            className="text-accent rounded-full px-3 py-1.5 text-sm font-semibold transition duration-200"
          >
            완료
          </button>
        </header>

        <div className="relative flex px-4 py-2">
          {/*
            가운데 밴드. 휠보다 아래에 깔고 pointer-events를 끊어 스크롤을 막지 않는다.
            높이는 DateWheel의 항목 높이(h-10)와 같다.
          */}
          <div
            aria-hidden
            className="rounded-inner bg-ink/[0.04] pointer-events-none absolute inset-x-4 top-1/2 h-10 -translate-y-1/2"
          />

          <DateWheel
            items={years}
            value={draft.year}
            onChange={(year) => patch({ year })}
            format={(y) => `${y}`}
          />
          <DateWheel
            items={MONTHS}
            value={draft.month}
            onChange={(month) => patch({ month })}
            format={(m) => `${m}월`}
          />
          <DateWheel
            items={days}
            value={draft.day}
            onChange={(day) => patch({ day })}
            format={(d) => `${d}일`}
          />

          {/*
            진짜 폼 컨트롤. 휠은 표현일 뿐이고 키보드·스크린리더는 이쪽을 쓴다 —
            예전 select 3개와 같은 경험이라 접근성에 회귀가 없다.
            name을 주지 않는다. 주면 바깥 폼이 이 값들까지 함께 보낸다.
          */}
          <div className="sr-only">
            <select
              aria-label="년"
              value={draft.year}
              onChange={(e) => patch({ year: Number(e.target.value) })}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}년
                </option>
              ))}
            </select>
            <select
              aria-label="월"
              value={draft.month}
              onChange={(e) => patch({ month: Number(e.target.value) })}
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}월
                </option>
              ))}
            </select>
            <select
              aria-label="일"
              value={draft.day}
              onChange={(e) => patch({ day: Number(e.target.value) })}
            >
              {days.map((d) => (
                <option key={d} value={d}>
                  {d}일
                </option>
              ))}
            </select>
          </div>
        </div>
      </Sheet>
    </>
  )
}
