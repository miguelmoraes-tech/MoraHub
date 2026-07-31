import { createClient } from "@/lib/supabase/server";
import {
  filtrarContasPorPapel,
  getClientesVinculados,
  getContasVinculadas,
  nomeConta,
  type ClienteVinculado,
} from "@/lib/colaborador";
import { PropriedadeIntelectualBoard } from "@/components/colaborador/propriedade-intelectual-board";
import type { PropriedadeIntelectual } from "@/lib/types";

export default async function AdvogadoPropriedadeIntelectualPage() {
  const contas = filtrarContasPorPapel(await getContasVinculadas(), "advogado");
  const donoIds = contas.map((c) => c.dono_id);
  const contasByDono = new Map(contas.map((c) => [c.dono_id, c]));

  const clientes = await getClientesVinculados(donoIds);
  const clientesComDono: ClienteVinculado[] = clientes.map((cliente) => ({
    ...cliente,
    donoNome: nomeConta(contasByDono.get(cliente.user_id)),
  }));

  const supabase = await createClient();
  const { data: itens } = donoIds.length
    ? ((await supabase
        .from("propriedade_intelectual")
        .select("*")
        .in("user_id", donoIds)
        .order("data_renovacao", { ascending: true })) as {
        data: PropriedadeIntelectual[] | null;
      })
    : { data: [] as PropriedadeIntelectual[] };

  return (
    <PropriedadeIntelectualBoard itens={itens ?? []} clientes={clientesComDono} />
  );
}
