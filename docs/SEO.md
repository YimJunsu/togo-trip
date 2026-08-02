# SEO / GEO 운영 문서

투고트립(https://togo-trip.com)의 검색 노출 설정. 문구·도메인의 원본은
`lib/seo/site.ts` 하나뿐이고, 나머지 파일은 전부 그 값을 읽어 쓴다.

## 1. 구성 파일

| 파일 | 하는 일 |
| --- | --- |
| `lib/seo/site.ts` | 도메인·서비스명·설명·키워드 원본 |
| `lib/seo/metadata.ts` | 페이지 메타데이터 생성기 (canonical + og + twitter를 한 번에) |
| `lib/seo/JsonLd.tsx` | 구조화 데이터 (Organization / WebSite / WebApplication / FAQ / Breadcrumb) |
| `lib/seo/ogFont.ts` | OG 이미지용 한글 폰트 서브셋 로더 |
| `app/layout.tsx` | 전역 메타데이터·소유확인 토큰·robots 지시 |
| `app/robots.ts` | `/robots.txt` 생성 |
| `app/sitemap.ts` | `/sitemap.xml` 생성 (정적 6개 + 성향 결과 16개) |
| `app/opengraph-image.tsx` | 기본 공유 카드 1200×630 |
| `app/apple-icon.tsx` | iOS 홈 화면 아이콘 180×180 |
| `public/llms.txt` | 생성형 검색(AI)용 서비스 요약 |
| `next.config.ts` | 보안 헤더 |

## 2. 서치콘솔 소유확인

**구글·네이버 토큰은 이미 `lib/seo/site.ts`에 박혀 있다.** 배포만 하면 meta 태그가
나가고, 서치콘솔에서 "확인"만 누르면 된다. 환경변수 설정은 필요 없다.

토큰은 페이지 소스에 그대로 노출되는 공개 값이라 비밀이 아니다. 환경변수로 두면
"Vercel에 넣는 걸 잊어서 소유확인이 풀리는" 사고만 생기므로 코드에 둔다.

**속성을 다시 만들어 토큰이 바뀌면** `lib/seo/site.ts`의
`GOOGLE_SITE_VERIFICATION` / `NAVER_SITE_VERIFICATION` 값만 교체하고 재배포한다.
(서치콘솔이 주는 `<meta ...>` 태그 전체가 아니라 `content=` 안의 값만 넣는다.)

- 구글: https://search.google.com/search-console → 속성 추가 → **URL 접두어**
  `https://togo-trip.com` → HTML 태그 방식 → 확인
- 네이버: https://searchadvisor.naver.com → 웹마스터 도구 → 사이트 등록 → 확인

### 확인 후 바로 할 일 (양쪽 공통)

- 사이트맵 제출: `https://togo-trip.com/sitemap.xml`
- 구글: URL 검사 → `https://togo-trip.com` → **색인 생성 요청**
- 네이버: 요청 → 웹페이지 수집에 주요 URL 몇 개 직접 넣기
  (네이버는 사이트맵만으로는 잘 안 긁는다)

### 다음(Daum)

https://register.search.daum.net/index.daum 에서 도메인만 등록하면 된다.
소유확인 태그가 필요 없다.

## 3. 배포 시 주의

- **함수 실행 리전은 `vercel.json`의 `regions: ["icn1"]`(서울)로 못박혀 있다.**
  지정하지 않으면 Vercel 기본값이 `iad1`(미국 버지니아)이라, 서울 사용자의 요청이
  태평양을 건너갔다가 서울의 Supabase를 조회하러 다시 건너온다. 실측으로 요청당
  200~300ms를 그렇게 썼다(`/robots.txt` 165ms vs `/privacy` 413ms).
  Hobby 플랜은 단일 리전만 지정할 수 있다.
  적용 여부는 응답 헤더로 확인한다 — `X-Vercel-Id: icn1::icn1::...`이면 서울 실행,
  `icn1::iad1::...`이면 아직 미국이다.
- `vercel.json`은 엄격한 JSON이고 스키마에 없는 키를 넣으면 배포가 실패한다.
  주석을 달 수 없으므로 설명은 이 문서에 적는다.
- `vercel.json`의 `crons`는 매일 UTC 18:00(KST 03:00)에 `/api/cron/ingest-tour`를 부른다.
  미적재 시군구 3건씩 적재하며, 사이트맵의 지역 페이지가 여기에 맞춰 매주 스스로 자란다.
  `CRON_SECRET` 환경변수가 Vercel에 없으면 라우트가 401만 돌려주고 적재가 멈춘다.


- 도메인은 `lib/seo/site.ts`의 `PRODUCTION_URL` 하나가 기준이다. 환경변수를 아무것도
  안 넣는 게 정상 상태다. `NEXT_PUBLIC_SITE_URL`은 로컬·프리뷰용 예외이고,
  운영 빌드(`VERCEL_ENV=production`)에서 localhost가 들어오면 무시하도록 막아 뒀다.
- `www.togo-trip.com`으로도 들어올 수 있다면, 도메인 설정에서 한쪽을
  **301 리다이렉트**로 몰아준다. 두 주소가 다 열리면 중복 콘텐츠가 된다.
- 새 배포마다 사이트맵의 `lastModified`가 갱신된다. 별도 조작이 필요 없다.

## 4. 색인 정책

| 경로 | 색인 | 이유 |
| --- | --- | --- |
| `/`, `/random`, `/style`, `/style/{코드}`, `/compat` | O | 로그인 없이 열리는 실제 콘텐츠 |
| `/login`, `/signup` | O (낮은 우선순위) | 브랜드 검색 유입 |
| `/join`, `/trips/**` | X | 로그인 필요 — 크롤러엔 리다이렉트만 보인다 |
| `/compat/result` | X | 지금은 seed 결과 하나라 얕은 중복 페이지 |
| `/region/{코드}` (적재 완료) | O | 지역별 관광지·맛집 본문이 서버 렌더된다 |
| `/region/{코드}` (미적재) | X | 목록이 비어 있다. `noIndex: true`, sitemap 제외. robots로는 막지 않는다 — 막으면 적재된 뒤에도 크롤러가 못 들어온다 |
| `/admin/**` | X | 관리자 전용. `noIndex: true` **그리고** `robots.ts` 차단 |

`app/robots.ts`와 `app/sitemap.ts`가 같은 정책을 따른다. 한쪽만 고치면
서치콘솔이 "사이트맵에 있는데 robots가 막음" 경고를 낸다.

## 5. GEO (생성형 검색 최적화)

ChatGPT·Claude·Perplexity 같은 AI 검색이 서비스를 정확히 설명하게 만드는 부분.

- `public/llms.txt` — 서비스가 뭔지, 무료인지, 가입이 필요한지, 어떤 기능이 있는지를
  평문으로 적어 둔다. AI가 페이지를 잘못 요약하는 대부분의 원인은 이 정보가
  본문 어디에도 명시돼 있지 않아서다.
- `WebApplication` 구조화 데이터의 `offers.price: 0` — "유료 아님"을 기계가 읽는 형태로.
- 홈 하단 FAQ (`components/seo/SiteFaq.tsx`) — AI 답변이 그대로 인용하는 자리.
  **문답 원본은 그 파일의 `FAQ_ITEMS` 하나뿐이고 화면과 JSON-LD가 같이 쓴다.**
  화면에 없는 내용을 FAQ 구조화 데이터에만 넣으면 스팸으로 취급돼 통째로 무시된다.
- `app/robots.ts`에서 GPTBot·ClaudeBot·PerplexityBot·Google-Extended를 명시 허용.
  AI 학습/인용을 막고 싶어지면 이 블록의 `allow`를 `disallow`로 바꾼다.

## 6. 새 페이지를 추가할 때

`CLAUDE.md`의 SEO 항목을 실제로 밟는 순서다.

1. **메타데이터** — `pageMetadata()`로 만든다. `title`에 브랜드명을 직접 붙이지 않는다
   (템플릿이 `· 투고트립`을 자동으로 붙인다). `description`은 검색 스니펫에 그대로
   나가므로 80~155자.

   ```ts
   export const metadata = pageMetadata({
     title: '여행지 뽑기',
     description: '...',
     path: '/random',
   })
   ```

   동적 라우트는 `generateMetadata`에서 같은 헬퍼를 반환하고, 대상이 없으면
   `{ title: '...', robots: { index: false } }`로 빠진다.

2. **색인 정책 반영** — §4 표에 맞춰 `app/sitemap.ts` 또는
   `app/robots.ts` + `noIndex: true`. 공개/비공개 판단이 애매하면 "로그인 없이
   의미 있는 내용이 보이는가"로 가른다.

3. **본문 확보** — 서버 렌더 텍스트 800자 이상을 목표로 한다.

   상호작용이 클라이언트 컴포넌트 안에만 있으면 크롤러에겐 빈 페이지다. `/random`은
   여행지 37건을 prop으로 넘겨받고도 본문이 263자뿐이라 어떤 검색어로도 뜰 수 없었다.
   같은 데이터를 서버에서 한 번 더 텍스트로 내보내 1,890자가 됐다
   (`DestinationDirectory`). `/style`도 같은 방식으로 164자 → 925자
   (`StyleDirectory`).

4. **내부 링크** — 새 상세 페이지로 걸어 들어오는 링크를 목록 페이지에 만든다.
   성향 결과 16개는 퀴즈를 끝까지 풀어야만 닿을 수 있어서 인바운드 링크가 0이었다.
   사이트맵에만 있는 URL은 색인 우선순위가 낮다.

5. **필요하면 확장** — 계층이 있으면 `breadcrumbGraph()`, 공유 대상이면
   `pageMetadata`의 `image`, 서비스 범위가 바뀌면 `public/llms.txt`.

6. 아래 §7로 검증.

## 7. 확인 방법

```bash
pnpm build && pnpm start
```

- http://localhost:3000/robots.txt
- http://localhost:3000/sitemap.xml
- http://localhost:3000/opengraph-image (한글이 두부(□)로 보이면 폰트 로드 실패)
- 배포 후 카카오톡 공유 디버거: https://developers.kakao.com/tool/debugger/sharing
- 리치 결과 테스트: https://search.google.com/test/rich-results

본문 글자 수(스크립트·태그 제외)를 재서 §6-3 기준을 넘었는지 본다.

```bash
curl -s https://togo-trip.com/새경로 | perl -CSD -0777 -ne 's/<script\b[^>]*>.*?<\/script>//gs; s/<[^>]*>/ /g; s/\s+/ /g; print length($_), "\n";'
```

이전에 쓰던 `sed 's/<script[^>]*>.*<\/script>//g'` + `wc -c` 조합은 실측으로 틀렸다고
확인됐다. HTML이 한 줄이고 `<script>`가 여러 개면 `.*`가 탐욕적으로 **첫 `<script>`부터
마지막 `</script>`까지** 통째로 지워 버려서, 실제로 955자였던 페이지가 1자로 측정됐다.
`.*?`(비탐욕)과 `/s`로 스크립트 태그 하나하나만 지워야 한다.

글자 수 세는 쪽도 그냥 고치면 안 된다. `wc -c`는 UTF-8 바이트 수를 세므로 한글
본문에서는 글자 수의 약 3배가 나와 얇은 페이지도 기준을 넘은 것처럼 보인다. 그렇다고
`wc -m`으로 바꾸는 것만으로는 부족하다 — `wc -m`은 로케일(`LC_ALL`/`LANG`)이 UTF-8로
설정돼 있어야만 제대로 세고, 로케일이 비어 있으면(이 프로젝트를 검증한 Windows Git
Bash 환경이 실제로 그랬다) 아무 경고 없이 `wc -c`와 똑같이 바이트 수를 반환한다 —
955자짜리 본문이 셸마다 다르게 2,238로 측정된 사고로 실측했다. 그래서 `wc`에
넘기지 않고 `perl -CSD`(입출력을 UTF-8로 명시적으로 다루도록 강제)로 같은 파이프라인
안에서 `length()`를 직접 찍는다. 로케일 설정과 무관하게 항상 같은 값이 나온다.
