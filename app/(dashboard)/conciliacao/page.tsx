import { createClient } from "@/lib/supabase/server";
import { getDonoIdAtivo, getWorkspaceIdAtivo } from "@/lib/empresa-ativa";
import { ConciliacaoView } from "@/components/conciliacao-view";
import { sugerirMatches } from "@/lib/conciliacao/match";
import type { Comprovante, Gasto, LancamentoExtrato } from "@/lib/types";

export default async function ConciliacaoPage() {
  const donoId = await getDonoIdAtivo();
  const workspaceId = await getWorkspaceIdAtivo();
  const supabase = await createClient();

  const [{ data: lancamentos }, { data: gastos }, { data: comprovantes }] = donoId && workspaceId
    ? await Promise.all([
        supabase.from("lancamentos_extrato").select("*").eq("user_id", donoId),
        supabase.from("gastos").select("*").eq("user_id", donoId),
        supabase.from("comprovantes").select("*").eq("workspace_id", workspaceId),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

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
      contas={donoId ? [{ donoId, nome: "Minha conta" }] : []}
    />
  );
}
