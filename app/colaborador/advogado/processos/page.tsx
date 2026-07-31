import { createClient } from "@/lib/supabase/server";
import {
  filtrarContasPorPapel,
  getClientesVinculados,
  getContasVinculadas,
  nomeConta,
  type ClienteVinculado,
} from "@/lib/colaborador";
import { ProcessosBoard } from "@/components/colaborador/processos-board";
import type { Processo } from "@/lib/types";

export default async function AdvogadoProcessosPage() {
  const contas = filtrarContasPorPapel(await getContasVinculadas(), "advogado");
  const donoIds = contas.map((c) => c.dono_id);
  const contasByDono = new Map(contas.map((c) => [c.dono_id, c]));

  const clientes = await getClientesVinculados(donoIds);
  const clientesComDono: ClienteVinculado[] = clientes.map((cliente) => ({
    ...cliente,
    donoNome: nomeConta(contasByDono.get(cliente.user_id)),
  }));

  const supabase = await createClient();
  const { data: processos } = donoIds.length
    ? ((await supabase
        .from("processos")
        .select("*")
        .in("user_id", donoIds)
        .order("proximo_prazo", { ascending: true })) as {
        data: Processo[] | null;
      })
    : { data: [] as Processo[] };

  return (
    <ProcessosBoard processos={processos ?? []} clientes={clientesComDono} />
  );
}
