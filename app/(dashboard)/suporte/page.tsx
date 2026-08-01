import { getEffectiveDonoIdForSuporte } from "@/lib/suporte";
import {
  getSuporteData,
  getColaboradoresParaResponsavel,
  computeSuporteOverview,
  nowMs,
} from "@/lib/tickets";
import { SuporteBoard } from "@/components/suporte/suporte-board";

export default async function SuportePage() {
  const donoId = await getEffectiveDonoIdForSuporte();
  const donoIds = donoId ? [donoId] : [];

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
      nowMs={now}
    />
  );
}
