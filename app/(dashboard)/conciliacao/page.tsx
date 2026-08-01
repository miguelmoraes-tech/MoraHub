import { createClient } from "@/lib/supabase/server";
import { getEffectiveDonoId } from "@/lib/financeiro";
import { ConciliacaoView } from "@/components/conciliacao-view";
import { sugerirMatches } from "@/lib/conciliacao/match";
import type { Comprovante, Gasto, LancamentoExtrato } from "@/lib/types";

export default async function ConciliacaoPage() {
  const donoId = await getEffectiveDonoId();
  const supabase = await createClient();

  const [{ data: lancamentos }, { data: gastos }, { data: comprovantes }] = donoId
    ? await Promise.all([
        supabase.from("lancamentos_extrato").select("*").eq("user_id", donoId),
        supabase.from("gastos").select("*").eq("user_id", donoId),
        supabase.from("comprovantes").select("*").eq("user_id", donoId),
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
