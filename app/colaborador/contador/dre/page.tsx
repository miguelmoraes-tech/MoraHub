import { createClient } from "@/lib/supabase/server";
import { filtrarContasPorPapel, getContasVinculadas, nomeConta } from "@/lib/colaborador";
import { DreView } from "@/components/dre-view";
import type { Comprovante, Gasto } from "@/lib/types";

export default async function ContadorDrePage() {
  const contas = filtrarContasPorPapel(await getContasVinculadas(), "contador");
  const donoIds = contas.map((c) => c.dono_id);
  const contasByDono = new Map(contas.map((c) => [c.dono_id, c]));

  const supabase = await createClient();
  const [{ data: gastos }, { data: comprovantes }] = donoIds.length
    ? await Promise.all([
        supabase.from("gastos").select("*").in("user_id", donoIds),
        supabase.from("comprovantes").select("*").in("user_id", donoIds),
      ])
    : [{ data: [] }, { data: [] }];

  return (
    <DreView
      gastos={((gastos ?? []) as Gasto[]).map((g) => ({
        ...g,
        donoId: g.user_id,
        donoNome: nomeConta(contasByDono.get(g.user_id)),
      }))}
      comprovantes={((comprovantes ?? []) as Comprovante[]).map((c) => ({
        ...c,
        donoId: c.user_id,
        donoNome: nomeConta(contasByDono.get(c.user_id)),
      }))}
      contas={contas.map((c) => ({ donoId: c.dono_id, nome: nomeConta(c) }))}
      exportBasePath="/api/export/dre"
    />
  );
}
