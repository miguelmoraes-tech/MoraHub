import { createClient } from "@/lib/supabase/server";
import { filtrarContasPorPapel, getContasVinculadas, nomeConta } from "@/lib/colaborador";
import { ConciliacaoView, type LancamentoComConta } from "@/components/conciliacao-view";
import { sugerirMatches, type SugestaoMatch } from "@/lib/conciliacao/match";
import type { Comprovante, Gasto, LancamentoExtrato } from "@/lib/types";

export default async function ContadorConciliacaoPage() {
  const contas = filtrarContasPorPapel(await getContasVinculadas(), "contador");
  const donoIds = contas.map((c) => c.dono_id);
  const contasByDono = new Map(contas.map((c) => [c.dono_id, c]));

  const supabase = await createClient();
  const [{ data: lancamentos }, { data: gastos }, { data: comprovantes }] = donoIds.length
    ? await Promise.all([
        supabase.from("lancamentos_extrato").select("*").in("user_id", donoIds),
        supabase.from("gastos").select("*").in("user_id", donoIds),
        supabase.from("comprovantes").select("*").in("user_id", donoIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const lancamentosTyped = (lancamentos ?? []) as LancamentoExtrato[];
  const gastosTyped = (gastos ?? []) as Gasto[];
  const comprovantesTyped = (comprovantes ?? []) as Comprovante[];

  // Sugestões calculadas conta por conta — senão um gasto da empresa A
  // poderia aparecer como candidato pra um lançamento da empresa B.
  const sugestoes: Record<string, SugestaoMatch> = {};
  for (const donoId of donoIds) {
    const mapa = sugerirMatches(
      lancamentosTyped.filter((l) => l.user_id === donoId),
      gastosTyped.filter((g) => g.user_id === donoId),
      comprovantesTyped.filter((c) => c.user_id === donoId)
    );
    for (const [id, sugestao] of mapa) sugestoes[id] = sugestao;
  }

  const lancamentosComContexto: LancamentoComConta[] = lancamentosTyped.map((l) => ({
    ...l,
    donoNome: nomeConta(contasByDono.get(l.user_id)),
  }));
  const gastosComContexto = gastosTyped.map((g) => ({
    ...g,
    donoNome: nomeConta(contasByDono.get(g.user_id)),
  }));
  const comprovantesComContexto = comprovantesTyped.map((c) => ({
    ...c,
    donoNome: nomeConta(contasByDono.get(c.user_id)),
  }));

  return (
    <ConciliacaoView
      lancamentos={lancamentosComContexto}
      gastos={gastosComContexto}
      comprovantes={comprovantesComContexto}
      sugestoes={sugestoes}
    />
  );
}
