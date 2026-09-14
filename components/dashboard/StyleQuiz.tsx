'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CaretLeftIcon } from '@phosphor-icons/react'
import type { QuizQuestion } from '@/lib/data/types'
import { scoreQuiz } from '@/lib/style/score'
import { saveMyStyleCode } from '@/lib/style/storage'

/**
 * 성향 테스트 진행부. 채점은 전부 브라우저에서 끝난다 —
 * 비회원도 쓰는 콘텐츠라 서버에 남길 것이 없고, 결과는 URL(/style/PMAS)이 곧 저장소다.
 */
export function StyleQuiz({ questions }: { questions: QuizQuestion[] }) {
  const router = useRouter()
  const [answers, setAnswers] = useState<number[]>([])
  const [isDone, setIsDone] = useState(false)
  const questionRef = useRef<HTMLHeadingElement>(null)
  const moveFocusRef = useRef(false)

  const step = answers.length
  const question = questions[step]

  useEffect(() => {
    if (!moveFocusRef.current || isDone) return
    moveFocusRef.current = false
    questionRef.current?.focus({ preventScroll: true })
    questionRef.current?.scrollIntoView({
      block: 'nearest',
      behavior: 'instant',
    })
  }, [step, isDone])

  function answer(score: number) {
    moveFocusRef.current = true
    const next = [...answers, score]
    setAnswers(next)

    if (next.length < questions.length) return

    setIsDone(true)
    const { code } = scoreQuiz(questions, next)
    // 결과 화면이 «이 사람이 직접 푼 결과인가»를 이걸로 가른다. 목록에서 눌러
    // 들어온 사람에게 «다시 해보기»를 내밀지 않기 위해서다.
    saveMyStyleCode(code)
    router.push(`/style/${code}`)
  }

  if (isDone || !question) {
    return (
      <div className="rounded-card border-line bg-surface shadow-soft border p-12 text-center">
        <p
          className="text-muted font-mono text-sm tracking-widest"
          role="status"
        >
          성향 분석 중…
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-card border-line bg-surface shadow-soft border p-5 sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted font-mono text-xs tracking-widest">
          {step + 1} / {questions.length}
        </span>
        {step > 0 && (
          <button
            type="button"
            onClick={() => {
              moveFocusRef.current = true
              setAnswers(answers.slice(0, -1))
            }}
            className="text-muted hover:text-ink flex min-h-11 items-center gap-1 text-sm font-medium transition duration-200"
          >
            <CaretLeftIcon size={14} weight="bold" aria-hidden />
            이전
          </button>
        )}
      </div>

      <div
        className="bg-paper mt-3 h-1.5 overflow-hidden rounded-full"
        role="progressbar"
        aria-label="여행 성향 테스트 진행"
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
        <p className="text-muted mt-6 text-xs">
          더 나다운 쪽을 골라 주세요. 정답은 없어요.
        </p>
        <h2
          ref={questionRef}
          tabIndex={-1}
          className="font-display mt-3 scroll-mt-24 text-2xl leading-snug font-semibold tracking-tight focus:outline-none"
        >
          {question.text}
        </h2>

        <div className="mt-5 flex flex-col gap-3">
          {question.options.map((option, index) => (
            <button
              key={option.label}
              type="button"
              onClick={() => answer(option.score)}
              className="rounded-inner border-line hover:border-accent hover:bg-accent-soft flex items-start gap-3 border p-4 text-left text-base leading-relaxed font-medium transition duration-200 ease-out active:scale-[0.99]"
            >
              <span
                className="text-accent bg-accent-soft flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-xs"
                aria-hidden
              >
                {index === 0 ? 'A' : 'B'}
              </span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
