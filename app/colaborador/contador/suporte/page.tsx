import {
  filtrarContasPorPapel,
  getContasVinculadas,
  nomeConta,
} from "@/lib/colaborador";
import {
  getSuporteData,
  getColaboradoresParaResponsavel,
  computeSuporteOverview,
  nowMs,
} from "@/lib/tickets";
import { SuporteBoard } from "@/components/suporte/suporte-board";

export default async function ContadorSuportePage() {
  const contas = filtrarContasPorPapel(await getContasVinculadas(), "contador");
  const donoIds = contas.map((c) => c.dono_id);
  const donoNomeById = new Map(contas.map((c) => [c.dono_id, nomeConta(c)]));

  const [{ tickets, clientes }, colaboradores] = await Promise.all([
    getSuporteData(donoIds),
    getColaboradoresParaResponsavel(donoIds),
  ]);
  const now = nowMs();

  return (
    <SuporteBoard
      tickets={tickets}
      clientes={clientes}
      colaboradores={colaboradores}
      overview={computeSuporteOverview(tickets, now)}
      donoNomeById={donoNomeById}
      nowMs={now}
    />
  );
}
