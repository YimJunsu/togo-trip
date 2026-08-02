# CLAUDE.md

> 이 파일은 Claude Code가 **매 세션 시작 시** 읽는 운영 매뉴얼입니다.
> 짧고 안정적으로 유지하고, 상세 내용은 `docs/`를 참조합니다.
> 규칙을 반복해서 교정하게 되면 여기에 한 줄로 적어 고정하세요.

## 프로젝트 한 줄 요약

친구들과 **국내 여행**을 계획·정산하는 웹앱. 랜덤 여행지 추천, 초대코드 기반 여행방, 엔빵 정산(운전자 할인 포함), 근처 맛집·착한식당, 여행 궁합.

## 지금 단계 (중요)

**실데이터 전환 중.** 회원 도메인은 Supabase Auth로 붙었고(`NEXT_PUBLIC_DATA_SOURCE` 스위치 뒤),
trip·expense·place·궁합 등 나머지는 아직 mock이다. (진행 상황: `docs/ROADMAP.md` Phase 6)

- 데이터 접근은 반드시 `lib/data/`의 repository 인터페이스를 거친다. UI가 mock인지 실서버인지 몰라야 한다.
- 도메인을 실서버로 옮길 땐 `lib/data/supabase/`에 같은 인터페이스로 구현하고 `index.ts`에서만 스위치. 화면은 건드리지 않는다.
- 아직 mock인 도메인에 Supabase/Kakao 직접 호출 코드를 UI·액션에 박지 않는다. 전환은 repository 단위로 한다.

## 기술 스택

- Next.js (App Router) · TypeScript (strict) · Tailwind CSS
- 패키지 매니저: **pnpm** (npm/yarn 금지)
- 상태: 서버 컴포넌트 우선, 클라이언트 상태 최소화 (필요 시 Zustand)
- 데이터: 지금은 mock, 이후 Supabase (Auth / Postgres / Realtime / Edge Functions)

## 항상 지킬 것

- 새 기능은 `docs/CONVENTIONS.md`의 폴더 구조·네이밍을 따른다.
- 통화는 원(₩), 날짜는 국내 포맷(`YYYY.MM.DD`), 지역·여행지는 **국내 한정**.
- 디자인은 두 갈래다: **대시보드 = 소프트 미니멀(라임 강조)**, **초대·여행권 = 보딩패스**. 섞지 말 것. (`docs/DESIGN_SYSTEM.md`)
- 하드코딩된 색·간격 금지. Tailwind 토큰/유틸만 사용.
- 컴포넌트는 작게. 한 파일 한 책임.
- 작업 완료 보고 전 `pnpm lint` 와 `pnpm typecheck` 를 통과시킨다.

## SEO / GEO / OG (새 페이지·콘텐츠 만들 때 필수)

검색 노출이 지금 최우선 과제다. 라우트를 추가하거나 콘텐츠를 늘릴 때 아래는 선택이 아니다.
빠뜨리면 그 페이지는 검색에 없는 것과 같다. 상세는 `docs/SEO.md`.

- 메타데이터는 `pageMetadata()`(`lib/seo/metadata.ts`)로만 만든다. `Metadata` 객체를 손으로 쓰지 않는다 — canonical·og·twitter를 나눠 적으면 반드시 어긋나고, 어긋난 canonical은 페이지를 색인에서 날린다. 동적 라우트는 `generateMetadata`에서 같은 헬퍼를 반환한다.
- 공개 화면이면 `app/sitemap.ts`에 추가. 로그인 필요·개인 데이터면 `noIndex: true` **그리고** `app/robots.ts` 차단 경로에 **둘 다** 넣는다. 한쪽만 고치면 서치콘솔이 경고한다.
- **서버에서 렌더되는 본문이 있어야 한다. 목표 800자 이상.** 클라이언트 컴포넌트 안의 데이터는 크롤러에 안 보인다. 데이터를 prop으로 넘겼다면 같은 데이터를 서버에서 텍스트로 한 번 더 내보낼 수 있는지 먼저 본다 (`DestinationDirectory`, `StyleDirectory` 참고).
- 새 상세 페이지에는 **다른 페이지에서 걸어 들어오는 내부 링크**를 만든다. 사이트맵에만 있고 인바운드 링크가 없는 URL은 색인 우선순위가 바닥이다.
- 서비스명·설명·키워드·도메인·소유확인 토큰의 원본은 `lib/seo/site.ts` 하나뿐이다. 다른 파일에 문자열로 복사하지 않는다.
- JSON-LD는 `lib/seo/JsonLd.tsx` 헬퍼를 쓴다. **화면에 없는 내용을 구조화 데이터에만 넣으면 스팸으로 취급돼 리치 결과에서 통째로 빠진다.** FAQ 원본은 `components/seo/SiteFaq.tsx`의 `FAQ_ITEMS` 하나이고 화면·JSON-LD가 같이 쓴다.
- 기능이 늘거나 무료/가입 정책이 바뀌면 `public/llms.txt`도 같이 고친다. 생성형 검색(AI)이 서비스를 잘못 요약하는 원인은 대부분 그 정보가 평문으로 어디에도 없어서다.
- 이미지는 `next/image` + `width`/`height`. 의미 있으면 `alt` 채우고, 장식이면 `alt=""`로 명시적으로 비운다.
- 완료 전 확인: 새 경로가 `/sitemap.xml`·`/robots.txt`에 의도대로 들어갔는지, HTML에 `rel="canonical"`과 `og:title`이 있는지, 375px에서 가로 스크롤이 없는지.

본문 글자 수 확인:

```bash
curl -s https://togo-trip.com/새경로 | perl -CSD -0777 -ne 's/<script\b[^>]*>.*?<\/script>//gs; s/<[^>]*>/ /g; s/\s+/ /g; print length($_), "\n";'
```

(`sed 's/<script[^>]*>.*<\/script>//g'` + `wc -c` 조합은 쓰지 않는다. `.*`가 탐욕적이라
스크립트 태그가 여러 개인 한 줄짜리 HTML에서 첫 태그부터 마지막 태그까지 통째로
지워 버려 955자 페이지가 1자로 측정된 사고가 있었다. `wc -c`도 UTF-8 바이트 수를 세어
한글 본문에서 글자 수의 약 3배로 부풀린다. `wc -m`으로 바꿔도 로케일이 UTF-8로 설정돼
있지 않으면 경고 없이 `wc -c`와 똑같이 동작한다 — 실제로 Windows Git Bash에서 로케일이
비어 있어 955자가 2,238로 측정된 채 재현됐다. 그래서 `wc`를 아예 쓰지 않고
`perl -CSD`로 입출력을 UTF-8로 강제한 뒤 그 안에서 `length()`를 직접 찍는다.)

## 하지 말 것

- 실제 API 키·시크릿을 코드/커밋에 넣지 않는다.
- `any` 타입 남발 금지. 불가피하면 `// TODO(type):` 주석.
- 요청하지 않은 대규모 리팩터·의존성 추가 금지. 먼저 제안하고 확인받는다.
- mock 데이터를 UI 컴포넌트 안에 직접 박지 않는다. 항상 `lib/data/`를 거친다.
- 상호작용 컴포넌트만 있고 서버 렌더 본문이 없는 페이지를 만들지 않는다. (`/random`이 여행지 37건을 받고도 본문 263자라 어떤 검색어로도 못 뜨던 실제 사고)
- 옛 이름 `wego` / `위고`를 쓰지 않는다. 정식 명칭은 **togo-trip / 투고트립**뿐이고, 어디서 발견되든 잔재이므로 고친다.

## 자주 쓰는 명령어

```bash
pnpm dev         # 개발 서버
pnpm lint        # ESLint
pnpm typecheck   # tsc --noEmit
pnpm format      # Prettier
```

## 상세 문서 (필요할 때 열기)

- 제품·기능·데이터 모델 → @docs/PROJECT_SPEC.md
- 코딩·폴더·목데이터·협업 규칙 → @docs/CONVENTIONS.md
- 디자인 시스템(소프트 미니멀 + 보딩패스) → @docs/DESIGN_SYSTEM.md
- 개발 순서 체크리스트 → @docs/ROADMAP.md
- SEO/GEO 구성·서치콘솔 운영·색인 정책 → @docs/SEO.md

## 협업 메모

- 커밋: Conventional Commits (`feat:`, `fix:`)
- PR은 작게, `main` / `master` 등 외 브랜치 포함(개발사항모두) 별도의 지시 있지 전까지 커밋, 푸시 금지. PR 리뷰 1인 이상.
