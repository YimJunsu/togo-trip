/**
 * public/datas/fooddata.csv → mocks/foods.json
 *
 * CSV가 사람이 손으로 고치는 원본이고, 앱은 이 스크립트가 만든 JSON만 읽는다.
 * public/은 정적 서빙 경로라 서버 코드가 fs로 읽을 자리가 아니고,
 * 런타임 파싱은 결과에 타입을 붙여 주지도 않는다. (CONVENTIONS §9)
 *
 *   node scripts/build-food-data.mjs
 *
 * 열량이 대량영양소 환산값(탄×4 + 단×4 + 지×9)과 8% 넘게 벌어지면 경고한다.
 * 이 검사는 실패시키지 않는다 — 조리법에 따라 벌어질 수 있는 값이고,
 * 사람이 CSV를 보고 판단할 문제라 자동으로 고치지 않는다.
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CSV_PATH = resolve(ROOT, 'public/datas/fooddata.csv')
const OUT_PATH = resolve(ROOT, 'mocks/foods.json')

/** CSV의 한글 라벨 → 코드. lib/utils/labels.ts의 라벨 표와 짝이다. */
const CATEGORY = {
  한식: 'korean',
  중식: 'chinese',
  일식: 'japanese',
  양식: 'western',
  분식: 'bunsik',
  패스트푸드: 'fastfood',
  아시안: 'asian',
  샐러드: 'salad',
  디저트: 'dessert',
  음료: 'beverage',
}

const CONDITION = {
  '추운 날': 'cold',
  '더운 날': 'hot',
  '피곤할 때': 'tired',
  '스트레스 받을 때': 'stress',
  '숙취 해소': 'hangover',
  '몸이 아플 때': 'sick',
  '술 한잔': 'alcohol',
  가성비: 'cheap',
  '다이어트 중': 'diet',
  '특별한 날': 'special',
}

const HEADER =
  '메뉴명,종류,컨디션,이모지,칼로리(kcal),탄수화물(g),단백질(g),지방(g),나트륨(mg)'

/** 열량 오차 허용 폭. 이걸 넘으면 사람이 볼 수 있게 경고만 찍는다. */
const KCAL_TOLERANCE = 0.08

/** 이름이 그대로면 id도 그대로다. 행 순서를 바꿔도 id가 흔들리지 않게 한다. */
function idOf(name) {
  return `food-${createHash('sha1').update(name).digest('hex').slice(0, 8)}`
}

function fail(message) {
  console.error(`✗ ${message}`)
  process.exit(1)
}

const raw = readFileSync(CSV_PATH, 'utf8').replace(/^﻿/, '')
const lines = raw.split(/\r?\n/).filter((line) => line.trim() !== '')

if (lines[0] !== HEADER) {
  fail(`헤더가 다릅니다.\n  기대: ${HEADER}\n  실제: ${lines[0]}`)
}

const foods = []
const seen = new Set()
const warnings = []

lines.slice(1).forEach((line, i) => {
  const lineNo = i + 2
  const cells = line.split(',')
  if (cells.length !== 9) {
    fail(`${lineNo}행: 열이 9개여야 하는데 ${cells.length}개입니다 — ${line}`)
  }

  const [name, categoryLabel, conditionLabels, emoji, ...numbers] = cells.map(
    (c) => c.trim(),
  )

  // 이모지가 이 화면의 원색을 담당한다 (DESIGN_SYSTEM §8). 비면 카드에 구멍이 난다.
  if (!emoji) fail(`${lineNo}행: 이모지가 비어 있습니다 — ${name}`)

  if (seen.has(name)) fail(`${lineNo}행: 메뉴명이 중복입니다 — ${name}`)
  seen.add(name)

  const category = CATEGORY[categoryLabel]
  if (!category) fail(`${lineNo}행: 모르는 종류 — ${categoryLabel}`)

  const conditions = conditionLabels.split('|').map((label) => {
    const code = CONDITION[label.trim()]
    if (!code) fail(`${lineNo}행: 모르는 컨디션 — ${label}`)
    return code
  })
  if (new Set(conditions).size !== conditions.length) {
    fail(`${lineNo}행: 컨디션이 중복입니다 — ${conditionLabels}`)
  }

  const [kcal, carbsG, proteinG, fatG, sodiumMg] = numbers.map((value) => {
    const n = Number(value)
    if (!Number.isFinite(n) || n < 0) {
      fail(`${lineNo}행: 영양값이 숫자가 아닙니다 — ${value}`)
    }
    return n
  })

  const computed = carbsG * 4 + proteinG * 4 + fatG * 9
  if (computed > 0 && Math.abs(kcal - computed) / computed > KCAL_TOLERANCE) {
    warnings.push(
      `${lineNo}행 ${name}: 표기 ${kcal}kcal, 대량영양소 환산 ${computed}kcal`,
    )
  }

  foods.push({
    id: idOf(name),
    name,
    category,
    conditions,
    emoji,
    nutrition: { kcal, carbsG, proteinG, fatG, sodiumMg },
  })
})

writeFileSync(OUT_PATH, `${JSON.stringify(foods, null, 2)}\n`, 'utf8')

const byCategory = new Map()
for (const food of foods) {
  byCategory.set(food.category, (byCategory.get(food.category) ?? 0) + 1)
}

console.log(`✓ ${foods.length}건 → mocks/foods.json`)
console.log(
  `  종류: ${[...byCategory].map(([c, n]) => `${c} ${n}`).join(' · ')}`,
)
if (warnings.length) {
  console.warn(`\n⚠ 열량 오차 ${warnings.length}건 (자동으로 고치지 않습니다)`)
  for (const warning of warnings) console.warn(`  ${warning}`)
}
