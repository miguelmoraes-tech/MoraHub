import type { PessoalAccount, PessoalTransaction } from "@/lib/pessoal/types";

type BalanceTransaction = Pick<PessoalTransaction, "account_id" | "type" | "amount">;

/**
 * `accounts.balance` is a manually-entered snapshot set when the account is
 * created/edited — it's never retroactively touched by transactions. The
 * "current" balance shown in the UI is always this derived estimate:
 * stored balance + receitas − despesas lançadas naquela conta (todas, sem
 * filtro de período).
 */
export function computeEstimatedBalancesByAccount(
  accounts: PessoalAccount[],
  transactions: BalanceTransaction[]
): Map<string, number> {
  const balances = new Map<string, number>(
    accounts.map((account) => [account.id, account.balance])
  );

  for (const transaction of transactions) {
    if (!transaction.account_id) continue;
    if (!balances.has(transaction.account_id)) continue;
    const current = balances.get(transaction.account_id)!;
    const delta =
      transaction.type === "receita" ? transaction.amount : -transaction.amount;
    balances.set(transaction.account_id, current + delta);
  }

  return balances;
}

export function sumEstimatedBalances(balances: Map<string, number>): number {
  let total = 0;
  for (const value of balances.values()) total += value;
  return total;
}
