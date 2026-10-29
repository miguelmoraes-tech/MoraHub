import { createClient } from "@/lib/supabase/server";
import { getAcessoFinanceiro } from "@/lib/financeiro/acesso";
import { ConciliacaoView } from "@/components/conciliacao-view";
import { SemAcessoAviso, SemValoresAviso } from "@/components/financeiro/sem-valores";
import { sugerirMatches } from "@/lib/conciliacao/match";
import type { Comprovante, Gasto, LancamentoExtrato } from "@/lib/types";

export default async function ConciliacaoPage() {
  const fin = await getAcessoFinanceiro();
  if (!fin) return <SemAcessoAviso titulo="Conciliação Bancária" />;
  // A tela é só extrato e valores.
  if (!fin.valores) return <SemValoresAviso titulo="Conciliação Bancária" />;
  const supabase = await createClient();

  const [{ data: lancamentos }, { data: gastos }, { data: comprovantes }] = await Promise.all([
    supabase.from("lancamentos_extrato").select("*").eq("workspace_id", fin.workspaceId),
    supabase.from("gastos").select("*").eq("workspace_id", fin.workspaceId),
    supabase.from("comprovantes").select("*").eq("workspace_id", fin.workspaceId),
  ]);

  const lancamentosTyped = (lancamentos ?? []) as LancamentoExtrato[];
  const gastosTyped = (gastos ?? []) as Gasto[];
  const comprovantesTyped = (comprovantes ?? []) as Comprovante[];

  const sugestoes = Object.fromEntries(
    sugerirMatches(lancamentosTyped, gastosTyped, comprovantesTyped)
  );

  return (
    <ConciliacaoView
      lancamentos={lancamentosTyped}
      gastos={gastosTyped}
      comprovantes={comprovantesTyped}
      sugestoes={sugestoes}
      somenteLeitura={fin.somenteLeitura}
    />
  );
}
