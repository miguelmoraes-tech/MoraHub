import { createClient } from "@/lib/supabase/server";
import {
  filtrarContasPorPapel,
  getClientesVinculados,
  getContasVinculadas,
  nomeConta,
} from "@/lib/colaborador";
import {
  FinanceiroReadOnly,
  type ComprovanteComContexto,
  type GastoComContexto,
} from "@/components/colaborador/financeiro-readonly";
import type { Comprovante, Gasto } from "@/lib/types";

export default async function ContadorFinanceiroPage() {
  const contas = filtrarContasPorPapel(await getContasVinculadas(), "contador");
  const donoIds = contas.map((c) => c.dono_id);
  const contasByDono = new Map(contas.map((c) => [c.dono_id, c]));

  const clientes = await getClientesVinculados(donoIds);
  const clientesById = new Map(clientes.map((c) => [c.id, c]));

  const supabase = await createClient();
  const [{ data: gastos }, { data: comprovantes }] = donoIds.length
    ? await Promise.all([
        supabase
          .from("gastos")
          .select("*")
          .in("user_id", donoIds)
          .order("data", { ascending: false }),
        supabase
          .from("comprovantes")
          .select("*")
          .in("user_id", donoIds)
          .order("data", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }];

  const gastosComContexto: GastoComContexto[] = ((gastos ?? []) as Gasto[]).map(
    (gasto) => ({
      ...gasto,
      clienteNome: gasto.cliente_id
        ? (clientesById.get(gasto.cliente_id)?.nome ?? "Cliente removido")
        : null,
      donoNome: nomeConta(contasByDono.get(gasto.user_id)),
    })
  );

  const comprovantesComContexto: ComprovanteComContexto[] = (
    (comprovantes ?? []) as Comprovante[]
  ).map((comprovante) => ({
    ...comprovante,
    clienteNome:
      clientesById.get(comprovante.cliente_id)?.nome ?? "Cliente removido",
    donoNome: nomeConta(contasByDono.get(comprovante.user_id)),
  }));

  return (
    <FinanceiroReadOnly
      gastos={gastosComContexto}
      comprovantes={comprovantesComContexto}
    />
  );
}
