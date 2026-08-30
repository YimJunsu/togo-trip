import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TourApiError, readOverview, readTourBody, toAttraction } from './parse.ts'

// TourAPI는 결과를 response.body.items.item에 담아 보낸다. 이 helper는 items.item이 받는 값이다.
const ok = (items: unknown) =>
  JSON.stringify({
    response: {
      header: { resultCode: '0000', resultMsg: 'OK' },
      body: { items, numOfRows: 10, pageNo: 1, totalCount: 1 },
    },
  })

const ITEM = {
  contentid: '126508',
  contenttypeid: '12',
  title: '경복궁',
  addr1: '서울특별시 종로구 사직로 161',
  mapx: '126.9769930325',
  mapy: '37.5760836609',
  firstimage: 'http://tong.visitkorea.or.kr/cms/a.jpg',
  cat1: 'A02',
  cat2: 'A0201',
  cat3: 'A02010100',
  tel: '02-3700-3900',
}

test('정상 응답에서 item 배열을 꺼낸다', () => {
  const items = readTourBody(ok({ item: [ITEM] }))
  assert.equal(items.length, 1)
  assert.equal(items[0].contentid, '126508')
})

test('item이 1건일 때 객체로 오는 경우도 배열로 만든다', () => {
  // TourAPI는 결과가 하나면 배열이 아니라 객체를 준다. 그대로 두면 목록 순회가 깨진다.
  const items = readTourBody(ok({ item: ITEM }))
  assert.equal(items.length, 1)
})

test('결과가 0건이면 빈 배열이다 — 예외가 아니다', () => {
  assert.deepEqual(readTourBody(ok('')), [])
})

test('resultCode가 0000이 아니면 예외를 던진다', () => {
  const body = JSON.stringify({
    response: { header: { resultCode: '0001', resultMsg: 'APPLICATION ERROR' } },
  })
  assert.throws(() => readTourBody(body), (err: unknown) => {
    assert.ok(err instanceof TourApiError)
    assert.equal(err.code, '0001')
    assert.equal(err.limitExceeded, false)
    return true
  })
})

test('한도 초과는 limitExceeded 플래그가 선다 — 재시도해도 소용없는 오류다', () => {
  const body = JSON.stringify({
    response: {
      header: {
        resultCode: '22',
        resultMsg: 'LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR',
      },
    },
  })
  assert.throws(() => readTourBody(body), (err: unknown) => {
    assert.ok(err instanceof TourApiError)
    assert.equal(err.limitExceeded, true)
    return true
  })
})

test('XML 응답은 예외를 던진다 — 상태코드는 200으로 온다', () => {
  const xml =
    '<OpenAPI_ServiceResponse><cmmMsgHeader><returnAuthMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</returnAuthMsg></cmmMsgHeader></OpenAPI_ServiceResponse>'
  assert.throws(() => readTourBody(xml), (err: unknown) => {
    assert.ok(err instanceof TourApiError)
    assert.match(err.message, /XML/)
    assert.match(err.message, /SERVICE_KEY_IS_NOT_REGISTERED_ERROR/)
    return true
  })
})

test('앞에 공백이 붙은 XML도 잡는다', () => {
  assert.throws(() => readTourBody('\n  <OpenAPI_ServiceResponse/>'), TourApiError)
})

test('item을 Attraction으로 변환한다', () => {
  const a = toAttraction(ITEM, '11010')
  assert.deepEqual(a, {
    contentId: '126508',
    contentTypeId: 12,
    regionCode: '11010',
    title: '경복궁',
    addr: '서울특별시 종로구 사직로 161',
    coords: [37.5760836609, 126.9769930325],
    imageUrl: 'http://tong.visitkorea.or.kr/cms/a.jpg',
    overview: null,
  })
})

test('좌표가 없으면 coords가 null이다 — 건을 버리지 않는다', () => {
  const a = toAttraction({ ...ITEM, mapx: '', mapy: '' }, '11010')
  assert.equal(a?.coords, null)
  assert.equal(a?.title, '경복궁')
})

test('좌표가 0이면 null로 본다 — TourAPI가 미상을 0으로 준다', () => {
  const a = toAttraction({ ...ITEM, mapx: '0', mapy: '0' }, '11010')
  assert.equal(a?.coords, null)
})

test('이미지가 없으면 imageUrl이 null이다', () => {
  const a = toAttraction({ ...ITEM, firstimage: '' }, '11010')
  assert.equal(a?.imageUrl, null)
})

test('주소가 없으면 addr이 null이다', () => {
  const a = toAttraction({ ...ITEM, addr1: '' }, '11010')
  assert.equal(a?.addr, null)
})

test('음식점(39)도 변환된다', () => {
  const a = toAttraction({ ...ITEM, contenttypeid: '39' }, '11010')
  assert.equal(a?.contentTypeId, 39)
})

test('12·39가 아닌 타입은 null이다 — 적재 대상이 아니다', () => {
  assert.equal(toAttraction({ ...ITEM, contenttypeid: '14' }, '11010'), null)
})

test('contentid나 title이 없으면 null이다 — 기본키가 없으면 담을 수 없다', () => {
  assert.equal(toAttraction({ ...ITEM, contentid: '' }, '11010'), null)
  assert.equal(toAttraction({ ...ITEM, title: '' }, '11010'), null)
})

test('overview를 꺼낸다', () => {
  assert.equal(readOverview(ok({ item: [{ ...ITEM, overview: '조선 왕조 제일의 법궁.' }] })), '조선 왕조 제일의 법궁.')
})

test('overview가 없으면 null이다', () => {
  assert.equal(readOverview(ok({ item: [ITEM] })), null)
  assert.equal(readOverview(ok('')), null)
})

test('overview의 HTML 태그와 개행을 지운다 — 본문에 그대로 나가는 값이다', () => {
  const raw = ok({ item: [{ ...ITEM, overview: '앞<br>뒤<br />\n  아래' }] })
  assert.equal(readOverview(raw), '앞 뒤 아래')
})
