import assert from 'node:assert/strict'
import { test } from 'node:test'
import { detectPlatform } from './install.ts'

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; SM-S911N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'
const MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'
const WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

test('아이폰·안드로이드를 가른다', () => {
  assert.equal(detectPlatform(IPHONE), 'ios')
  assert.equal(detectPlatform(ANDROID), 'android')
})

test('데스크톱은 대상이 아니다', () => {
  assert.equal(detectPlatform(WINDOWS), 'other')
  assert.equal(detectPlatform(MAC), 'other')
})

test('아이패드는 데스크톱 UA로 오므로 터치 여부로 가른다', () => {
  // iPadOS 사파리는 UA에 iPad를 넣지 않는다. 터치가 없는 진짜 맥과 갈리는 지점이
  // 이것뿐이라, 이 분기가 빠지면 아이패드 사용자에게 안내가 영영 안 뜬다.
  assert.equal(detectPlatform(MAC, true), 'ios')
  assert.equal(detectPlatform(MAC, false), 'other')
})

test('터치되는 윈도우 노트북을 아이폰으로 오인하지 않는다', () => {
  assert.equal(detectPlatform(WINDOWS, true), 'other')
})

test('안드로이드 판정이 iOS보다 앞선다', () => {
  // 일부 안드로이드 웹뷰가 UA에 Safari와 Mac 계열 토큰을 함께 싣는다.
  const hybrid = `${ANDROID} Version/4.0 Safari/537.36 like Mac OS X`
  assert.equal(detectPlatform(hybrid, true), 'android')
})
