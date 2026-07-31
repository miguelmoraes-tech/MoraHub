import { createClient } from "@/lib/supabase/server";
import {
  filtrarContasPorPapel,
  getClientesVinculados,
  getContasVinculadas,
  nomeConta,
  type ClienteVinculado,
} from "@/lib/colaborador";
import { FechamentosGrid } from "@/components/colaborador/fechamentos-grid";
import type { FechamentoMensal } from "@/lib/types";

export default async function ContadorFechamentosPage() {
  const contas = filtrarContasPorPapel(await getContasVinculadas(), "contador");
  const donoIds = contas.map((c) => c.dono_id);
  const contasByDono = new Map(contas.map((c) => [c.dono_id, c]));

  const clientes = await getClientesVinculados(donoIds);
  const clientesComDono: ClienteVinculado[] = clientes.map((cliente) => ({
    ...cliente,
    donoNome: nomeConta(contasByDono.get(cliente.user_id)),
  }));

  const supabase = await createClient();
  const { data: fechamentos } = donoIds.length
    ? ((await supabase
        .from("fechamentos_mensais")
        .select("*")
        .in("user_id", donoIds)) as { data: FechamentoMensal[] | null })
    : { data: [] as FechamentoMensal[] };

  return (
    <FechamentosGrid clientes={clientesComDono} fechamentos={fechamentos ?? []} />
  );
}
