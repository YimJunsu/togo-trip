import type { IngestTarget } from './ingest.ts'

/**
 * 같은 TourAPI 지역을 공유하는 시군구 묶음.
 *
 * TourAPI는 수원시·성남시·안양시·안산시·고양시·용인시·청주시·천안시·전주시·
 * 포항시·창원시를 통째로 하나로 보는데 이 저장소는 구 단위로 쪼개져 있다.
 * 같은 응답을 구 수만큼 다시 받아 올 이유가 없다 — 시군구 30개가 12개 그룹으로
 * 접히므로 콜 126회를 아낀다.
 */
export type IngestGroup = {
  areaCode: number
  sigunguCode: number | null
  /** 이 그룹에 속한 시군구 코드. 한 번 받은 결과를 이 코드 전부에 쓴다. */
  codes: string[]
}

/** 입력 순서를 보존한다 — 호출부가 priority 순으로 넘기기 때문이다. */
export function groupTargets(targets: IngestTarget[]): IngestGroup[] {
  const groups: IngestGroup[] = []
  const index = new Map<string, IngestGroup>()

  for (const target of targets) {
    const key = `${target.areaCode}/${target.sigunguCode ?? 'null'}`
    const existing = index.get(key)
    if (existing) {
      existing.codes.push(target.code)
      continue
    }
    const group: IngestGroup = {
      areaCode: target.areaCode,
      sigunguCode: target.sigunguCode,
      codes: [target.code],
    }
    index.set(key, group)
    groups.push(group)
  }

  return groups
}
