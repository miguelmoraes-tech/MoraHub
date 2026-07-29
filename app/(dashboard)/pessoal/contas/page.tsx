import { createClient } from "@/lib/supabase/server";
import { ContasSection } from "@/components/pessoal/contas-section";
import type { PessoalAccount, PessoalTransaction } from "@/lib/pessoal/types";

type BalanceTransaction = Pick<PessoalTransaction, "account_id" | "type" | "amount">;

export default async function PessoalContasPage() {
  const supabase = await createClient();

  const [{ data: contas }, { data: transacoes }] = (await Promise.all([
    supabase.from("pessoal_accounts").select("*").order("name"),
    supabase.from("pessoal_transactions").select("account_id, type, amount"),
  ])) as [
    { data: PessoalAccount[] | null },
    { data: BalanceTransaction[] | null },
  ];

  return (
    <ContasSection contas={contas ?? []} transacoes={transacoes ?? []} />
  );
}
