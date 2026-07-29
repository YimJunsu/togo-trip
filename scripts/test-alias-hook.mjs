/**
 * `pnpm test`(node --test)용 모듈 해석 훅.
 *
 * 테스트 러너는 번들러를 거치지 않아서, 소스가 당연하게 쓰는 세 가지를 스스로
 * 풀지 못한다. 그래서 지금까지는 그 셋을 하나도 쓰지 않는 순수 모듈만 테스트할 수
 * 있었고, `lib/data/mock/`은 import 자체가 ERR_MODULE_NOT_FOUND로 죽었다.
 *
 *   1) `@/x` 별칭(tsconfig paths) → 프로젝트 루트의 `x`
 *   2) 확장자 없는 상대 경로 → `.ts` / `.tsx` / `/index.ts`
 *   3) `.json`은 `export default {...}` 모듈로 바꿔 읽는다. ESM은 JSON import에
 *      `with { type: 'json' }`을 요구하는데, 번들러를 타는 프로덕션 코드에는
 *      필요 없는 문법이라 소스에 없다. 소스를 테스트 사정에 맞춰 고치는 대신
 *      여기서 흡수한다.
 *
 * 프로덕션 번들에는 들어가지 않는다 — package.json의 test 스크립트에서만 --import 된다.
 */
import { readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)

/** 번들러가 붙여 주던 확장자. 순서가 곧 우선순위다. */
const EXTENSIONS = ['.ts', '.tsx', '/index.ts']

registerHooks({
  resolve(specifier, context, nextResolve) {
    const target = specifier.startsWith('@/')
      ? new URL(specifier.slice(2), root).href
      : specifier

    try {
      return nextResolve(target, context)
    } catch (error) {
      // 확장자를 생략한 상대/별칭 경로일 때만 되짚는다. 그 외(오타난 패키지명 등)는
      // 아래에서 원래 오류를 그대로 다시 던져 원인을 흐리지 않는다.
      if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error
      for (const extension of EXTENSIONS) {
        try {
          return nextResolve(target + extension, context)
        } catch {
          // 다음 후보로 넘어간다.
        }
      }
      throw error
    }
  },

  load(url, context, nextLoad) {
    if (!url.endsWith('.json')) return nextLoad(url, context)
    return {
      format: 'module',
      shortCircuit: true,
      source: `export default ${readFileSync(fileURLToPath(url), 'utf8')}`,
    }
  },
})
