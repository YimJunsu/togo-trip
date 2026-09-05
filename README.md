# 투고트립 (togo-trip)

친구들과 떠나는 국내여행을 한 곳에서. 여행지 뽑기 → 초대코드 여행방 → 엔빵 정산.

- 운영: https://togo-trip.com
- 저장소: https://github.com/YimJunsu/togo-trip
- 스택: Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · Supabase (Auth · Postgres · RLS)

## 기능

| | |
| --- | --- |
| 여행지 뽑기 | 테마·예산·계절로 거른 뒤 랜덤 추출 |
| 여행방 | 6자리 초대코드로 참여. 멤버·날짜별 일정 |
| 엔빵 정산 | 균등 분배 → 운전자 할인 → 송금 최소화. 확정하면 잠긴다 |
| 지역 콘텐츠 | 공공데이터 관광정보로 만든 250개 시군구 페이지 |
| 여행 성향·궁합 | 4축 16유형 진단과 두 사람 비교 |
| 로그인 | 이메일 · 구글 (만 14세 이상, 약관 동의 필수) |

## 실행

```bash
pnpm install
pnpm dev
```

http://localhost:3000 에서 확인한다. 환경변수는 `.env.local.example`를 `.env.local`로
복사해 채운다. `NEXT_PUBLIC_DATA_SOURCE`가 `supabase`가 아니면 모든 데이터가
`mocks/`의 목 데이터로 흐르므로, Supabase 없이도 화면 전체를 돌려볼 수 있다.

```bash
pnpm lint        # ESLint
pnpm typecheck   # tsc --noEmit
pnpm test        # node --test (lib/**/*.test.ts)
pnpm build       # 프로덕션 빌드
pnpm format      # Prettier
```

## 구조

| 경로 | 역할 |
| --- | --- |
| `app/` | 라우트. 화면은 `app/(app)/`, 자동화는 `app/api/cron/` |
| `components/` | 화면 컴포넌트. `ui/`는 갈래 중립 프리미티브 |
| `lib/data/` | 저장소 인터페이스 + mock/supabase 구현. **화면은 `lib/data`만 import한다** |
| `lib/settle/` | 정산 순수 함수 + 단위 테스트 |
| `lib/tour/` | 공공데이터 관광정보 적재 |
| `lib/seo/` | 사이트 상수·메타데이터 헬퍼·구조화 데이터 |
| `supabase/` | `schema.sql`(원본) · `migrations/`(적용 기록) · `seed/` |
| `mocks/` | 목 데이터 JSON |
| `proxy.ts` | Supabase 세션 갱신 (Next.js 16의 middleware 후속 규약) |

데이터 소스는 `lib/data/index.ts` 한 곳에서 갈아끼운다. 지금은 회원·여행방·지출·정산·일정·관광지가
Supabase에 있고, 여행지·장소·궁합·성향은 아직 mock이다.

## 데이터베이스

`supabase/schema.sql`이 원본이다. Supabase SQL Editor에 통째로 붙여 실행하면 되고,
몇 번을 실행해도 안전하다. `supabase/migrations/`는 이미 운영 중인 DB에 얹은 변경분의
기록이며 순번은 적용 시간 순이다.

## SEO

메타데이터·사이트맵·OG·구조화 데이터는 `lib/seo/site.ts` 한 곳을 원본으로 삼는다.
서치콘솔 등록 절차와 색인 정책은 `docs/SEO.md`에 있다.

## 문서

개발 문서는 `docs/`에 있고 저장소에는 올라가지 않는다(`.gitignore`). 개발자끼리 따로 공유한다.

| 파일 | 내용 |
| --- | --- |
| `CLAUDE.md` | 세션 시작 시 읽는 운영 매뉴얼 |
| `docs/PROJECT_SPEC.md` | 무엇을 만드는가 — 기능·화면·데이터 모델 |
| `docs/CONVENTIONS.md` | 어떻게 만드는가 — 폴더·네이밍·repository 패턴·테스트 |
| `docs/DESIGN_SYSTEM.md` | 어떻게 보이는가 — 토큰과 세 가지 시각 언어 |
| `docs/ROADMAP.md` | 개발 순서와 남은 일 |
| `docs/SEO.md` | 검색 노출 구성과 운영 |
