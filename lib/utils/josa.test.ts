import { test } from 'node:test'
import assert from 'node:assert/strict'
import { withJosa } from './josa.ts'

test('받침이 있으면 앞쪽 조사가 붙는다', () => {
  assert.equal(withJosa('아침형', '이/가'), '아침형이')
  assert.equal(withJosa('계획', '이/가'), '계획이')
  assert.equal(withJosa('기상', '은/는'), '기상은')
  assert.equal(withJosa('알뜰', '과/와'), '알뜰과')
})

test('받침이 없으면 뒤쪽 조사가 붙는다', () => {
  assert.equal(withJosa('올빼미', '이/가'), '올빼미가')
  assert.equal(withJosa('휴식', '이/가'), '휴식이')
  assert.equal(withJosa('플렉스', '이/가'), '플렉스가')
  assert.equal(withJosa('즉흥형', '과/와'), '즉흥형과')
})

test('이나/나도 받침을 본다', () => {
  // 음식 공유 문구가 쓴다. "김밥나 먹으러 가자"가 되면 문장이 깨진다.
  assert.equal(withJosa('김밥', '이나/나'), '김밥이나')
  assert.equal(withJosa('순두부찌개', '이나/나'), '순두부찌개나')
  assert.equal(withJosa('짜장면', '이나/나'), '짜장면이나')
  assert.equal(withJosa('파스타', '이나/나'), '파스타나')
})

test('한글이 아니면 받침 없는 쪽으로 붙인다', () => {
  assert.equal(withJosa('PMAS', '이/가'), 'PMAS가')
  assert.equal(withJosa('78', '은/는'), '78는')
})

test('빈 문자열이어도 터지지 않는다', () => {
  assert.equal(withJosa('', '이/가'), '가')
})

test('끝 공백은 무시한다', () => {
  assert.equal(withJosa('계획 ', '이/가'), '계획 이')
})
