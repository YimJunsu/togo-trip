# 투고트립 (togo-trip)

친구들과 떠나는 국내여행을 한 곳에서. 여행지 뽑기 → 초대코드 여행방 → 엔빵 정산.

- 운영: https://togo-trip.com
- 저장소: https://github.com/YimJunsu/togo-trip
- 스택: Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · Supabase Auth

## 실행

```bash
pnpm install
pnpm dev
```

http://localhost:3000 에서 확인한다. 환경변수는 `.env.local.example`를 `.env.local`로
복사해 채운다. `NEXT_PUBLIC_DATA_SOURCE`가 `supabase`가 아니면 모든 데이터는
`mocks/`의 목 데이터로 흐른다(회원 도메인만 Supabase 전환 완료).

```bash
pnpm typecheck   # tsc --noEmit
pnpm lint
pnpm test        # lib/**/*.test.ts
pnpm format
```

## 구조

| 경로 | 역할 |
| --- | --- |
| `app/` | 라우트. 실제 화면은 `app/(app)/` 아래 |
| `components/` | 화면 단위 컴포넌트 |
| `lib/data/` | 저장소 인터페이스 + mock/supabase 구현. 화면은 `lib/data`만 import한다 |
| `lib/seo/` | 사이트 상수·메타데이터 헬퍼·구조화 데이터 |
| `mocks/` | 목 데이터 JSON |
| `proxy.ts` | Supabase 세션 갱신 (Next.js 16의 middleware 후속 규약) |

## SEO

메타데이터·사이트맵·OG·구조화 데이터는 `lib/seo/site.ts` 한 곳을 원본으로 삼는다.
서치콘솔 등록 절차와 토큰 넣는 위치는 [docs/SEO.md](docs/SEO.md)에 있다.
