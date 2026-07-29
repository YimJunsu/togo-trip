/** 당사자만 보냄 표시를 토글할 수 있다. 남의 송금을 대신 보냈다고 표시할 수 없다. */
export function isSettlementParty(
  settlement: { from: string; to: string },
  userId: string,
): boolean {
  return settlement.from === userId || settlement.to === userId
}
