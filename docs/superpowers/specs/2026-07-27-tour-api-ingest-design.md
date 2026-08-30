# 공공데이터 관광정보 적재 및 지역 페이지 설계

작성일: 2026-07-27
브랜치: `feat/tour-api-ingest`

## 1. 목적

세 가지를 한 번에 푼다.

1. **실데이터 전환** — 다트로 뽑은 시군구에 실제 관광지·맛집을 붙인다.
2. **공공데이터 포털 연동** — 한국관광공사 TourAPI를 데이터 원천으로 삼는다.
3. **Supabase 잠김 방지** — 무료 플랜은 일정 기간 활동이 없으면 프로젝트가 정지된다. 적재 배치가 매일 쓰기를 발생시켜 이를 막는다.

부수 효과로 최대 250개의 서버 렌더 지역 페이지가 생긴다. 검색 노출이 프로젝트 최우선 과제이므로 이 효과를 설계에 명시적으로 포함한다.

## 2. 범위

### 포함

- TourAPI **관광지(contentTypeId=12)** 와 **음식점(contentTypeId=39)** 적재
- 시군구 250건 마스터 테이블과 통계청 코드 ↔ TourAPI 지역코드 매핑
- Vercel Cron 기반 일일 소배치 적재 + 미적재 지역 read-through 적재
- 다트 결과 카드에 관광지·맛집 3~5건 노출
- `/region/[code]` 서버 렌더 지역 페이지 신설과 색인 정책
- `/admin/ingest` 적재 이력 조회 관리자 페이지

### 제외 (다음 브랜치)

- **`Destination` 도메인 교체.** 지금은 mock 37건을 그대로 둔다. 근거는 §3.
- **행정안전부 착한가격업소 API.** 지역코드 체계가 또 달라 매핑이 한 벌 더 필요하고, TourAPI 음식점과 상호명으로 대조하면 정확도가 낮다. 별도 테이블로 독립 적재하는 것이 맞다.
- **TourAPI 문화시설(14)·레포츠(28).** 관광지가 적은 수도권 자치구를 채우는 보충재로 유용하나, 먼저 12·39로 커버리지를 확인한 뒤 판단한다.
- **관리자 페이지의 수동 재실행 버튼.** §8 참고.

## 3. `Destination`을 지금 제거하지 않는 이유

`DartGame.tsx:146`은 이미 `drawDestination({ region })`을 호출한다. "다트 → 그 지역 여행지 1건"은 이미 동작하고, 없는 것은 "3~5건 목록"이다.

`Destination`과 TourAPI 관광지는 층위가 다르다.

| | `Destination` (mock 37건) | TourAPI 관광지 |
| --- | --- | --- |
| 단위 | 시도 (`강원`, `부산`) | 시군구 |
| 성격 | 큐레이션된 목적지 ("강릉 안목해변") | 개별 스팟 (사찰·전망대·공원) |
| 분류 | `theme` / `budget` / `season` — 자체 축 | `cat1`/`cat2`/`cat3` — 관광공사 코드 |
| 문장 | 감성 요약 ("커피거리와 파도 소리") | `overview` — 길고 건조한 관공서 문체 |

지금 제거하면 세 곳이 깨진다.

1. **슬롯머신 조건 필터.** `theme`/`budget`/`season`은 TourAPI에 없다. `cat` 코드 매핑을 새로 설계해야 한다.
2. **`/random`의 서버 렌더 본문 1,890자.** `DestinationDirectory`가 이 페이지의 유일한 본문이다. 적재가 약 12주에 걸쳐 진행되므로 그 기간 내내 본문이 얇아지고, 색인 손해는 회복되지 않는다.
3. `/about`도 `destinationRepo.list()`를 사용한다.

따라서 순서를 나눈다. 이번 브랜치는 `Attraction`을 신설하고, 전국 적재가 끝난 뒤 별도 브랜치에서 `Destination`을 TourAPI 파생으로 승격하며 mock seed를 버린다.

## 4. 구조

### 4-1. 새로 만드는 모듈

각 모듈은 하나의 책임을 갖고, 아래로만 의존한다.

| 모듈 | 책임 | 의존 |
| --- | --- | --- |
| `lib/tour/client.ts` | TourAPI HTTP 호출, 응답코드 검사. 도메인을 모른다 | `TOUR_API_KEY` |
| `lib/tour/parse.ts` | TourAPI 응답 → `Attraction` 변환. **순수함수, 네트워크 없음** | 없음 |
| `lib/tour/ingest.ts` | "시군구 N개를 적재한다" 유스케이스 | client, parse, `lib/supabase/admin.ts` |
| `lib/supabase/admin.ts` | service role 클라이언트. 이 파일 밖에서 service role 키를 읽지 않는다 | `SUPABASE_SERVICE_ROLE_KEY` |
| `lib/data/supabase/attractionRepo.ts` | 조회 구현 (anon 키, 읽기 전용) | `lib/supabase/server.ts` |
| `lib/data/mock/attractionRepo.ts` | 조회 구현 (seed) | `mocks/attractions.json` |
| `app/api/cron/ingest-tour/route.ts` | 스케줄 트리거, 시크릿 검증, 시간 예산 관리. 도메인 로직 없음 | `ingest.ts` |
| `app/(app)/region/[code]/page.tsx` | 지역 페이지 (서버 렌더) | `attractionRepo` |
| `app/(app)/admin/ingest/page.tsx` | 적재 이력 조회 (서버 렌더) | `lib/supabase/server.ts` |

I/O 경계는 `client.ts` 하나다. 나머지는 순수함수이거나 주입으로 대체 가능하므로 네트워크를 타는 테스트가 필요 없다.

### 4-2. 지역코드 매핑

TourAPI의 지역코드는 통계청 코드와 다른 체계다 (`areaCode`는 시도 단위 자체 번호, `sigunguCode`는 시도별 일련번호). 런타임에 매번 조회하지 않고 빌드타임에 한 번 만들어 커밋한다.

`scripts/build-tour-area-map.mjs`

1. TourAPI 지역코드 조회로 시도 목록과 각 시도의 시군구 목록을 받는다.
2. `lib/geo/korea-sigungu.json`의 250건과 `province` + `name`으로 대조한다.
3. `lib/geo/tour-area-map.json`을 생성한다: `{ "42150": { "areaCode": 32, "sigunguCode": 1 }, ... }`
4. 대조 실패 건을 콘솔에 남긴다. 스크립트 안의 보정 테이블(`MANUAL_OVERRIDES`)에 손으로 채운 뒤 다시 돌린다.

예상되는 대조 실패 유형:

- **세종특별자치시** — 시군구가 없다. `sigunguCode`를 `null`로 두고 시도 단위로 조회한다.
- **강원특별자치도 / 전북특별자치도** — TourAPI가 옛 명칭(`강원도`, `전라북도`)으로 줄 수 있다.
- **통합시·행정시** — 청주시·창원시처럼 한쪽만 구 단위로 쪼개진 경우.

테스트가 "250건 전부 매핑이 있다"를 강제하므로 누락이 남은 채 진행될 수 없다.

### 4-3. 건드리지 않는 것

`RandomDrawer`, `DestinationDirectory`, `/about`, `Place` / `PlacesPanel`, auth 도메인.

### 4-4. 건드리는 것

`DartResultCard`(관광지 목록과 지역 페이지 링크 추가), `lib/data/index.ts`(`attractionRepo` 한 줄), `app/sitemap.ts`, `app/robots.ts`, `public/llms.txt`, `docs/SEO.md` §4 색인 정책 표.

## 5. 스키마

```sql
-- 시군구 마스터 250건. seed로 한 번 채우고 이후엔 상태만 바뀐다.
create table public.regions (
  code               text primary key,          -- 통계청 5자리
  name               text not null,
  province           text not null,
  tour_area_code     int  not null,
  tour_sigungu_code  int,                       -- 세종은 null
  priority           int  not null default 999, -- 적재 순서. 낮을수록 먼저
  ingested_at        timestamptz,               -- null이면 미적재
  attraction_count   int  not null default 0,
  restaurant_count   int  not null default 0
);

-- 관광지(12)와 음식점(39)을 한 테이블에 담는다.
-- TourAPI 공통 필드가 같고, 지역 페이지가 둘을 함께 읽기 때문이다.
create table public.attractions (
  content_id       text primary key,            -- TourAPI contentid
  content_type_id  int  not null,
  region_code      text not null references public.regions(code),
  title            text not null,
  addr             text,
  lat              double precision,
  lng              double precision,
  image_url        text,
  cat1 text, cat2 text, cat3 text,
  overview         text,                        -- 지역 페이지 본문의 재료. 음식점은 항상 null
  tel              text,
  updated_at       timestamptz not null default now()
);
create index on public.attractions (region_code, content_type_id);

-- 적재 이력. 실패 원인을 나중에 확인할 유일한 창구다.
create table public.ingest_runs (
  id           bigserial primary key,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  region_codes text[],
  upserted     int not null default 0,
  trigger      text not null default 'cron',    -- cron | read_through
  status       text not null default 'running', -- running | ok | failed
  error        text
);

-- 관리자 플래그
alter table public.profiles add column is_admin boolean not null default false;
```

### RLS

```sql
alter table public.regions     enable row level security;
alter table public.attractions enable row level security;
alter table public.ingest_runs enable row level security;

-- 공개 콘텐츠. 읽기만 연다.
create policy "지역 공개 읽기"   on public.regions     for select using (true);
create policy "관광지 공개 읽기" on public.attractions for select using (true);

-- 적재 이력은 관리자만.
create policy "관리자만 적재 이력 읽기" on public.ingest_runs
  for select using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.is_admin)
  );
```

세 테이블 모두 insert/update 정책이 없다. 쓰기는 RLS를 우회하는 **service role 키로만** 가능하고, 그 키는 `lib/supabase/admin.ts` 한 파일에 갇힌다.

관리자 권한 부여 UI는 만들지 않는다. SQL Editor에서 직접 준다.

```sql
update public.profiles set is_admin = true where email = '<관리자 이메일>';
```

### 적재 순서 (`priority`)

관광 수요가 높은 곳부터 채운다. 생성되는 지역 페이지의 색인 가치가 높고, 다트가 꽂혔을 때 결과 만족도도 높기 때문이다. seed SQL에 티어로 넣는다.

- **Tier 1 (`priority` 1–30)** — 제주시, 서귀포시, 강릉시, 속초시, 양양군, 춘천시, 평창군, 정선군, 고성군(강원), 경주시, 안동시, 포항시, 부산 해운대구, 부산 수영구, 부산 중구, 통영시, 거제시, 남해군, 여수시, 순천시, 담양군, 전주시 완산구, 전주시 덕진구, 태안군, 보령시, 가평군, 단양군, 울릉군, 서울 종로구, 서울 중구
- **Tier 2 (`priority` 100–)** — Tier 1에 없는 모든 `시`
- **Tier 3 (`priority` 200–)** — 모든 `군`
- **Tier 4 (`priority` 300–)** — 광역시·특별시의 나머지 자치구

같은 티어 안에서는 통계청 코드 오름차순으로 결정론적 순서를 갖는다.

## 6. 데이터 흐름

### 6-1. 정기 적재 — Vercel Cron, 매일

```json
{ "crons": [{ "path": "/api/cron/ingest-tour", "schedule": "0 18 * * *" }] }
```

UTC 18:00 = KST 03:00.

**매일 소배치를 택한 이유.** Vercel Hobby는 함수 실행시간 상한이 짧아(설정해도 60초대) 한 번에 시군구 15개를 처리하면 타임아웃 위험이 크다. 또한 주 1회 실행은 장애가 한 번만 나도 Supabase에 2주 공백이 생겨 잠김 방지 목적 자체가 흔들린다. 매일 3건이면 주 21건으로 목표치(주 10~20건)를 충족하면서 두 문제를 함께 없앤다.

라우트가 하는 일:

1. `Authorization: Bearer $CRON_SECRET`을 검증한다. 불일치면 401. 이 엔드포인트는 공개 URL이다.
2. `regions`에서 `ingested_at is null`인 행을 `priority asc, code asc`로 3건 조회한다.
3. 각 시군구에 대해 `ingest.ts`를 실행한다.
4. `ingest_runs`에 결과를 기록한다.

**시간 예산.** 라우트가 시작 시각을 들고 있다가 시군구 하나를 끝낼 때마다 경과 시간을 확인한다. 남은 예산이 한 시군구 처리 예상치보다 적으면 거기서 멈추고 200으로 응답한다.

**재실행 안전성이 이 설계의 핵심이다.** 처리된 시군구는 `ingested_at`이 찍혀 있으므로 다음 실행이 자동으로 그 다음부터 집는다. 타임아웃으로 프로세스가 죽어도 결과는 같다 — 이미 upsert된 행은 남고, `ingested_at`이 없는 지역이 다시 대상이 된다. 그래서 별도 재시도 큐를 두지 않는다.

**한 시군구당 API 콜 수**: 관광지 목록 1 + 음식점 목록 1 + 관광지 `overview` 5 = **7콜**. 3시군구면 21콜.

**속도**: 하루 3건 × 7일 = 주 21건. 250건 완주까지 약 12주.

### 6-2. Read-through — 미적재 지역 즉석 적재

`attractionRepo.listByRegion(code)`가 빈 결과를 받으면 그 자리에서 `ingest.ts`를 1회 실행하고 결과를 반환한다. cron과 **같은 함수**를 쓴다. 경로가 둘인데 로직이 둘이면 반드시 갈라진다.

- 다트 결과 카드는 클라이언트 컴포넌트이고 이미 `pending` 상태 UI가 있다. 2~3초가 걸려도 로딩이 보인다.
- 지역 페이지는 서버 렌더라 첫 방문자만 느리다. 두 번째부터는 DB에서 나간다.
- 동시 요청이 겹쳐도 upsert가 멱등이므로 락을 두지 않는다. 최악의 결과는 같은 데이터를 두 번 쓰는 것이다.

**일일 상한.** `ingest_runs`에서 당일 `trigger='read_through'` 건수를 세어 상한(초기값 50)을 넘으면 즉석 적재를 중단하고 빈 상태 안내로 떨어진다. 사용자 트래픽이 TourAPI 일일 한도를 소진해 cron까지 실패시키는 것을 막는 안전핀이다.

### 6-3. 조회 계약

```ts
export type Attraction = {
  contentId: string
  /** 12 관광지 · 39 음식점 */
  contentTypeId: 12 | 39
  regionCode: string
  title: string
  addr: string | null
  /** 좌표가 없는 건이 있다. 목록 표시에는 지장이 없어 버리지 않는다. */
  coords: [number, number] | null
  imageUrl: string | null
  /** 음식점은 항상 null. detailCommon 호출 비용 때문에 관광지만 채운다. */
  overview: string | null
}

export type RegionSummary = {
  code: string
  name: string
  province: string
  /** null이면 미적재. 지역 페이지의 색인 여부를 이 값이 정한다. */
  ingestedAt: string | null
  attractionCount: number
  restaurantCount: number
}

export interface AttractionRepository {
  listByRegion(
    code: string,
    opts?: { type?: 12 | 39; limit?: number },
  ): Promise<Attraction[]>
  getRegion(code: string): Promise<RegionSummary | null>
  /** sitemap과 지역 디렉터리용. 적재 완료된 지역만 반환한다. */
  listIngestedRegions(): Promise<RegionSummary[]>
}
```

`lib/data/mock/attractionRepo.ts`(seed 2~3개 시군구)와 `lib/data/supabase/attractionRepo.ts` 두 구현을 만들고, 스위치는 `lib/data/index.ts` 한 줄이다. 화면은 어느 쪽인지 모른다.

## 7. 지역 페이지와 SEO

### URL

`/region/[code]` — 예: `/region/42150`

로마자 slug(`/region/gangneung`)가 URL 키워드 측면에서 약간 유리하지만, 250개를 손으로 만들면 표기가 흔들리고(gangneung / kangnung) **한 번 배포된 URL은 되돌릴 수 없다.** 통계청 코드는 안정적이다. 검색 키워드는 `<title>`·`h1`·본문이 담당한다.

### 본문 구성 (서버 렌더, 목표 800자 이상)

- `h1` — "강릉시 가볼만한 곳"
- 리드 문단 — 지역명·시도·관광지 및 맛집 건수를 문장으로
- 관광지 5건 — 이름 + 주소 + `overview` 발췌 150자 (이것만으로 약 750자)
- 맛집 5건 — 이름 + 주소 + 카테고리
- 같은 시도의 `Destination` 링크 — `/random`으로 나가는 내부 링크
- `breadcrumbGraph()` — 홈 › 여행지 뽑기 › 강원 › 강릉시

메타데이터는 `pageMetadata()`로만 만든다. 동적 라우트이므로 `generateMetadata`에서 같은 헬퍼를 반환한다.

### 색인 정책 (`docs/SEO.md` §4 표에 행 추가)

| 상태 | 색인 | 처리 |
| --- | --- | --- |
| 적재 완료 (`ingestedAt != null`) | O | sitemap 등록 + `pageMetadata()` 기본값 |
| 미적재 | X | sitemap 제외 + `noIndex: true` |
| 존재하지 않는 코드 | — | `notFound()` |
| `/admin/**` | X | `noIndex: true` **그리고** `robots.ts` 차단 |

`app/sitemap.ts`가 `listIngestedRegions()`를 호출해 적재분만 넣는다. 적재가 진행되면 sitemap이 매주 스스로 자란다.

`app/robots.ts`는 `/region`을 막지 않는다. 미적재 페이지는 `noIndex`가 이미 막고 있고, robots로 막으면 나중에 적재된 뒤에도 크롤러가 들어오지 못한다.

### 내부 링크

사이트맵에만 있고 인바운드 링크가 없는 URL은 색인 우선순위가 바닥이다. 걸어 들어가는 길을 둘 만든다.

1. `DartResultCard`에 "○○ 가볼만한 곳" 링크
2. `/random` 하단, `DestinationDirectory` 아래에 적재 완료 지역 목록 (서버 렌더)

### `public/llms.txt`

"지역별 관광지·맛집 정보를 제공한다"는 한 줄을 추가한다. 생성형 검색이 서비스 범위를 잘못 요약하는 원인은 대개 그 정보가 평문으로 어디에도 없어서다.

## 8. 관리자 페이지

**경로: `/admin/ingest`**

### 권한

권한 판정의 원본은 **RLS**다 (§5). 페이지에서 `if (!isAdmin) notFound()`만 하면 그 검사를 빠뜨린 경로가 하나 생기는 순간 뚫린다. RLS가 있으면 관리자가 아닌 세션은 쿼리 자체가 빈 결과를 받는다. 페이지의 `notFound()`는 두 번째 방어선이다.

403이 아니라 **404**로 떨어뜨린다. 403은 "여기 무언가 있다"를 알려준다.

### 화면 (소프트 미니멀 갈래, `components/dashboard/`)

- 상단 요약 3칸 — 적재 완료 시군구 수 / 남은 시군구 수 / 마지막 실행 시각
- 실행 이력 — 최근 50건. 카드를 쌓지 않고 **하나의 카드 안에서 `divide-line`으로 행을 나눈다** (DESIGN_SYSTEM §2)
  - 시각 · 대상 시군구 · 트리거(cron/read-through) · upsert 건수 · 소요시간 · 상태
- 상태는 색만으로 전달하지 않는다 (DESIGN_SYSTEM §4). `성공`/`실패`/`진행중` 텍스트 배지를 쓰고, 실패에만 `danger` 색을 더한다.
- 실패 행은 펼치면 `error` 원문을 보여준다.
- 라임은 화면에서 한 곳 — "새로고침" 버튼에만 쓴다.

### 범위 밖: 수동 재실행 버튼

조회만 요구되었고, 재실행은 service role 쓰기 경로를 하나 더 만들어 권한 표면을 넓힌다. 실패해도 다음 날 cron이 같은 지역을 자동으로 다시 집는다(§6-1의 재실행 안전성). 필요해지면 다음 브랜치에서 추가한다.

## 9. 에러 처리

TourAPI가 규약을 어기는 지점이 셋 있고, 셋 다 조용히 잘못된 데이터를 적재하게 만든다.

- **에러를 HTTP 200으로 준다.** 본문의 `resultCode`가 `'0000'`이 아니면 예외를 던진다. 상태코드만 보면 빈 응답을 정상 적재로 처리하게 된다.
- **응답이 XML로 올 때가 있다.** 키 오류나 한도 초과 시 `_type=json` 지정이 무시된다. 파싱 전에 본문 앞부분을 검사해 XML이면 그 내용을 담아 예외를 던진다.
- **한도 초과**(`LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR`)는 재시도해도 소용없다. 해당 실행을 즉시 중단하고 `status='failed'`로 기록한 뒤 다음 날 재개한다.

그 밖에:

- 좌표·이미지·`overview`가 없는 건이 있다. 스킵하지 않고 `null`로 담는다. 이름과 주소만으로도 목록에 쓸모가 있다.
- 한 시군구가 실패해도 나머지 시군구는 계속 처리한다. 실패한 지역만 `ingested_at`이 비어 다음 실행 대상으로 남는다.

## 10. 테스트

`node --test` (기존 `pnpm test` 규칙).

| 파일 | 검증 |
| --- | --- |
| `lib/tour/parse.test.ts` | 고정 픽스처 → `Attraction` 변환. 좌표 없음 / 이미지 없음 / `overview` 없음 케이스 |
| `lib/tour/parse.test.ts` | `resultCode != '0000'` 과 XML 응답이 예외를 던지는지 |
| `lib/geo/tourAreaMap.test.ts` | **250개 시군구 전부 매핑이 존재하는지.** 세종(`sigunguCode` null)·제주 특수 케이스 |
| `lib/tour/ingest.test.ts` | client를 가짜로 주입해, 시간 예산 초과 시 남은 지역을 미처리로 남기는지 |

네트워크를 타는 테스트는 만들지 않는다. `client.ts`가 유일한 I/O 경계이고 나머지는 순수함수라 주입으로 끝난다.

## 11. 환경변수

| 이름 | 용도 |
| --- | --- |
| `TOUR_API_KEY` | TourAPI 인증키 |
| `SUPABASE_SERVICE_ROLE_KEY` | 적재 쓰기. **RLS를 우회하는 키** — `lib/supabase/admin.ts` 밖에서 읽지 않는다 |
| `CRON_SECRET` | cron 엔드포인트 검증 |
| `NEXT_PUBLIC_DATA_SOURCE=supabase` | 기존 값 |

앞의 셋에 `NEXT_PUBLIC_` 접두사를 붙이지 않는다. 붙으면 클라이언트 번들에 값이 그대로 실린다.

## 12. 착수 전 준비 (코드로 해결할 수 없는 것)

1. **공공데이터포털에서 TourAPI 활용신청.** 승인에 시간이 걸리며, 키가 없으면 §4-2 매핑 스크립트부터 막힌다. 승인 후 오퍼레이션 이름의 정확한 버전 접미사를 공식 문서에서 확인해 `client.ts`에 고정한다.
2. Vercel 환경변수 3개 등록 (`TOUR_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`).
3. Supabase SQL Editor에서 §5 스키마 실행 후 본인 계정에 `is_admin = true` 부여.

## 13. 완료 기준

- `pnpm lint`, `pnpm typecheck`, `pnpm test` 통과
- `scripts/build-tour-area-map.mjs`가 250건 전부를 매핑하고 테스트가 이를 확인
- 로컬에서 cron 라우트를 호출하면 시군구 3건이 적재되고 `ingest_runs`에 `status='ok'` 행이 남는다
- 다트를 던져 미적재 지역이 나와도 read-through로 관광지·맛집이 표시된다
- `/region/<적재된 코드>`의 서버 렌더 본문이 800자를 넘는다 (`docs/SEO.md` §7의 측정 명령으로 확인)
- `/sitemap.xml`에 적재된 지역만 있고, `/robots.txt`가 `/admin`을 막는다
- 관리자가 아닌 계정으로 `/admin/ingest`에 접근하면 404
- 375px에서 지역 페이지와 관리자 페이지에 가로 스크롤이 없다
