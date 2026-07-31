import { createClient } from "@/lib/supabase/server";
import {
  filtrarContasPorPapel,
  getClientesVinculados,
  getContasVinculadas,
  nomeConta,
  type ClienteVinculado,
} from "@/lib/colaborador";
import { ComplianceGrid } from "@/components/colaborador/compliance-grid";
import type { ComplianceJuridico } from "@/lib/types";

export default async function AdvogadoCompliancePage() {
  const contas = filtrarContasPorPapel(await getContasVinculadas(), "advogado");
  const donoIds = contas.map((c) => c.dono_id);
  const contasByDono = new Map(contas.map((c) => [c.dono_id, c]));

  const clientes = await getClientesVinculados(donoIds);
  const clientesComDono: ClienteVinculado[] = clientes.map((cliente) => ({
    ...cliente,
    donoNome: nomeConta(contasByDono.get(cliente.user_id)),
  }));

  const supabase = await createClient();
  const { data: registros } = donoIds.length
    ? ((await supabase
        .from("compliance_juridico")
        .select("*")
        .in("user_id", donoIds)) as { data: ComplianceJuridico[] | null })
    : { data: [] as ComplianceJuridico[] };

  return (
    <ComplianceGrid clientes={clientesComDono} registros={registros ?? []} />
  );
}
