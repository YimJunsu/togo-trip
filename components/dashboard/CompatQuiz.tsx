'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CaretLeftIcon } from '@phosphor-icons/react'
import type { QuizQuestion } from '@/lib/data/types'

/**
 * 궁합 문항 진행부. 결과는 /compat/result 가 보여 준다 —
 * 화면 안에 담아 두면 친구에게 넘길 주소가 없어서 공유가 성립하지 않는다.
 */
export function CompatQuiz({ questions }: { questions: QuizQuestion[] }) {
  const router = useRouter()
  const [answers, setAnswers] = useState<number[]>([])
  const [isDone, setIsDone] = useState(false)

  const step = answers.length
  const question = questions[step]

  function answer(score: number) {
    const next = [...answers, score]
    setAnswers(next)

    if (next.length < questions.length) return

    setIsDone(true)
    router.push('/compat/result')
  }

  if (isDone || !question) {
    return (
      <div className="rounded-card border-line bg-surface shadow-soft border p-12 text-center">
        <p
          className="text-muted font-mono text-sm tracking-widest"
          role="status"
        >
          궁합 맞추는 중…
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-card border-line bg-surface shadow-soft border p-6">
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted font-mono text-xs tracking-widest">
          {step + 1} / {questions.length}
        </span>
        {step > 0 && (
          <button
            type="button"
            onClick={() => setAnswers(answers.slice(0, -1))}
            className="text-muted hover:text-ink flex items-center gap-1 text-sm font-medium transition duration-200"
          >
            <CaretLeftIcon size={14} weight="bold" aria-hidden />
            이전
          </button>
        )}
      </div>

      <div
        className="bg-paper mt-3 h-1.5 overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={step + 1}
        aria-valuemin={1}
        aria-valuemax={questions.length}
      >
        <div
          className="bg-accent h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${((step + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* key로 문항이 바뀔 때마다 다시 올라오게 한다. */}
      <div key={question.id} className="animate-rise">
        <h2 className="font-display mt-6 text-2xl leading-snug font-semibold tracking-tight">
          {question.text}
        </h2>

        <div className="mt-5 flex flex-col gap-3">
          {question.options.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => answer(option.score)}
              className="rounded-inner border-line hover:border-ink hover:bg-paper border p-4 text-left text-base font-medium transition duration-200 ease-out active:scale-[0.99]"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
