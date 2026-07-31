import { createClient } from "@/lib/supabase/server";
import {
  filtrarContasPorPapel,
  getClientesVinculados,
  getContasVinculadas,
  nomeConta,
  type ClienteVinculado,
} from "@/lib/colaborador";
import {
  SolicitacoesBoard,
  type SolicitacaoComCliente,
} from "@/components/colaborador/solicitacoes-board";
import type { SolicitacaoDocumento } from "@/lib/types";

export default async function AdvogadoSolicitacoesPage() {
  const contas = filtrarContasPorPapel(await getContasVinculadas(), "advogado");
  const donoIds = contas.map((c) => c.dono_id);

  const clientes = await getClientesVinculados(donoIds);
  const contasByDono = new Map(contas.map((c) => [c.dono_id, c]));
  const clientesComDono: ClienteVinculado[] = clientes.map((cliente) => ({
    ...cliente,
    donoNome: nomeConta(contasByDono.get(cliente.user_id)),
  }));
  const clientesById = new Map(clientes.map((c) => [c.id, c]));

  const supabase = await createClient();
  const { data: solicitacoes } = donoIds.length
    ? ((await supabase
        .from("solicitacoes_documento")
        .select("*")
        .in("user_id", donoIds)
        .order("created_at", { ascending: false })) as {
        data: SolicitacaoDocumento[] | null;
      })
    : { data: [] as SolicitacaoDocumento[] };

  const solicitacoesComCliente: SolicitacaoComCliente[] = (
    solicitacoes ?? []
  ).map((item) => ({
    ...item,
    clienteNome: clientesById.get(item.cliente_id)?.nome ?? "Cliente removido",
  }));

  return (
    <SolicitacoesBoard
      solicitacoes={solicitacoesComCliente}
      clientes={clientesComDono}
    />
  );
}
