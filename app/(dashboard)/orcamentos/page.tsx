import { createClient } from "@/lib/supabase/server";
import { getDonoIdAtivo } from "@/lib/empresa-ativa";
import {
  OrcamentosBoard,
  type OrcamentoComRealizado,
} from "@/components/orcamentos-board";
import type { Gasto, Orcamento } from "@/lib/types";

export default async function OrcamentosPage() {
  const donoId = await getDonoIdAtivo();
  const supabase = await createClient();

  const [{ data: orcamentos }, { data: gastos }] = donoId
    ? await Promise.all([
        supabase
          .from("orcamentos")
          .select("*")
          .eq("user_id", donoId)
          .order("mes_referencia", { ascending: false }),
        supabase.from("gastos").select("*").eq("user_id", donoId),
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
    realizado:
      realizadoPorChave.get(
        `${item.categoria}|${item.mes_referencia.slice(0, 7)}`
      ) ?? 0,
  }));

  return <OrcamentosBoard orcamentos={orcamentosComRealizado} />;
}
