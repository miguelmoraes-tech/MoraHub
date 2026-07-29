import type { PessoalInvestment } from "@/lib/pessoal/types";

export function getInvestmentCurrentValue(investment: PessoalInvestment) {
  return investment.current_value ?? investment.invested_amount;
}

/**
 * `null` (not `0`) when there's no `current_value` yet or when
 * `invested_amount` is 0 — lets the UI distinguish "no data" from "0% return".
 */
export function getInvestmentReturnPct(investment: PessoalInvestment) {
  if (investment.current_value === null) return null;
  if (investment.invested_amount === 0) return null;
  return (
    (investment.current_value - investment.invested_amount) /
    investment.invested_amount
  );
}

export function computeInvestmentsSummary(investments: PessoalInvestment[]) {
  let totalInvested = 0;
  let totalCurrent = 0;
  let trackedInvested = 0;
  let trackedCurrent = 0;

  for (const investment of investments) {
    totalInvested += investment.invested_amount;
    totalCurrent += getInvestmentCurrentValue(investment);
    if (investment.current_value !== null) {
      trackedInvested += investment.invested_amount;
      trackedCurrent += investment.current_value;
    }
  }

  const returnPct =
    trackedInvested === 0 ? null : (trackedCurrent - trackedInvested) / trackedInvested;

  return { totalInvested, totalCurrent, returnPct };
}
