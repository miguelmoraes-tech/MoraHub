import { createClient } from "@/lib/supabase/server";
import { getAcessoFinanceiro } from "@/lib/financeiro/acesso";
import {
  OrcamentosBoard,
  type OrcamentoComRealizado,
} from "@/components/orcamentos-board";
import type { Gasto, Orcamento } from "@/lib/types";

export default async function OrcamentosPage() {
  const fin = await getAcessoFinanceiro();
  const supabase = await createClient();

  const [{ data: orcamentos }, { data: gastos }] = fin
    ? await Promise.all([
        supabase
          .from("orcamentos")
          .select("*")
          .eq("workspace_id", fin.workspaceId)
          .order("mes_referencia", { ascending: false }),
        // O "realizado" só é calculado para quem vê valores.
        fin.valores
          ? supabase.from("gastos").select("*").eq("workspace_id", fin.workspaceId)
          : Promise.resolve({ data: [] }),
      ])
    : [{ data: [] }, { data: [] }];

  const realizadoPorChave = new Map<string, number>();
  for (const gasto of (gastos ?? []) as Gasto[]) {
    if (!gasto.categoria) continue;
    const chave = `${gasto.categoria}|${gasto.data.slice(0, 7)}`;
    realizadoPorChave.set(chave, (realizadoPorChave.get(chave) ?? 0) + gasto.valor);
  }

  const orcamentosComRealizado: OrcamentoComRealizado[] = (
    (orcamentos ?? []) as Orcamento[]
  ).map((item) => ({
    ...item,
    valor_planejado: fin?.valores ? item.valor_planejado : 0,
    realizado:
      realizadoPorChave.get(
        `${item.categoria}|${item.mes_referencia.slice(0, 7)}`
      ) ?? 0,
  }));

  return (
    <OrcamentosBoard
      orcamentos={orcamentosComRealizado}
      somenteLeitura={!fin || fin.somenteLeitura}
      semValores={!fin?.valores}
    />
  );
}
