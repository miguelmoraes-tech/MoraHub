import type { createClient } from "@/lib/supabase/server";
import type { Campanha } from "@/lib/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface CampanhaMetrics {
  leadsGerados: number;
  clientesConvertidos: number;
  receitaGerada: number;
}

export interface CampanhaDerived {
  custoPorLead: number | null;
  roi: number | null;
}

const METRICS_VAZIO: CampanhaMetrics = {
  leadsGerados: 0,
  clientesConvertidos: 0,
  receitaGerada: 0,
};

type LeadRow = { id: string; campanha_id: string | null; status: string };
type ClienteRow = { id: string; lead_origem_id: string | null };
type ComprovanteRow = { cliente_id: string; valor: number | null };

/**
 * Leads gerados / clientes convertidos / receita gerada para cada campanha,
 * calculado em lote (uma única viagem por tabela) em vez de N+1 por campanha.
 * Receita é rastreada via clientes.lead_origem_id -> leads.campanha_id, já
 * que comprovantes não referencia a campanha diretamente.
 */
export async function getCampanhaMetricsMap(
  supabase: SupabaseServerClient,
  donoId: string,
  campanhaIds: string[]
): Promise<Map<string, CampanhaMetrics>> {
  const result = new Map<string, CampanhaMetrics>();
  if (campanhaIds.length === 0) return result;

  const [{ data: leads }, { data: clientes }] = (await Promise.all([
    supabase
      .from("leads")
      .select("id, campanha_id, status")
      .eq("user_id", donoId)
      .in("campanha_id", campanhaIds),
    supabase
      .from("clientes")
      .select("id, lead_origem_id")
      .eq("user_id", donoId)
      .not("lead_origem_id", "is", null),
  ])) as [{ data: LeadRow[] | null }, { data: ClienteRow[] | null }];

  const leadsList = leads ?? [];
  const clientesList = clientes ?? [];

  const campanhaByLeadId = new Map(leadsList.map((l) => [l.id, l.campanha_id]));

  const clienteIdsByCampanha = new Map<string, string[]>();
  for (const cliente of clientesList) {
    if (!cliente.lead_origem_id) continue;
    const campanhaId = campanhaByLeadId.get(cliente.lead_origem_id);
    if (!campanhaId) continue;
    const lista = clienteIdsByCampanha.get(campanhaId) ?? [];
    lista.push(cliente.id);
    clienteIdsByCampanha.set(campanhaId, lista);
  }

  const todosClienteIds = [...clienteIdsByCampanha.values()].flat();
  const { data: comprovantes } =
    todosClienteIds.length > 0
      ? ((await supabase
          .from("comprovantes")
          .select("cliente_id, valor")
          .eq("user_id", donoId)
          .in("cliente_id", todosClienteIds)) as { data: ComprovanteRow[] | null })
      : { data: [] as ComprovanteRow[] };

  const receitaPorCliente = new Map<string, number>();
  for (const c of comprovantes ?? []) {
    receitaPorCliente.set(
      c.cliente_id,
      (receitaPorCliente.get(c.cliente_id) ?? 0) + (c.valor ?? 0)
    );
  }

  const leadsPorCampanha = new Map<string, { total: number; convertidos: number }>();
  for (const lead of leadsList) {
    if (!lead.campanha_id) continue;
    const atual = leadsPorCampanha.get(lead.campanha_id) ?? { total: 0, convertidos: 0 };
    atual.total += 1;
    if (lead.status === "convertido") atual.convertidos += 1;
    leadsPorCampanha.set(lead.campanha_id, atual);
  }

  for (const campanhaId of campanhaIds) {
    const leadsInfo = leadsPorCampanha.get(campanhaId);
    const clienteIds = clienteIdsByCampanha.get(campanhaId) ?? [];
    const receitaGerada = clienteIds.reduce(
      (sum, id) => sum + (receitaPorCliente.get(id) ?? 0),
      0
    );
    result.set(campanhaId, {
      leadsGerados: leadsInfo?.total ?? 0,
      clientesConvertidos: leadsInfo?.convertidos ?? 0,
      receitaGerada,
    });
  }

  return result;
}

/** Custo por lead e ROI (%), derivados de valor_gasto + métricas agregadas. */
export function computeCampanhaDerived(
  campanha: Pick<Campanha, "valor_gasto">,
  metrics: CampanhaMetrics = METRICS_VAZIO
): CampanhaDerived {
  const valorGasto = campanha.valor_gasto ?? 0;
  const custoPorLead = metrics.leadsGerados > 0 ? valorGasto / metrics.leadsGerados : null;
  const roi = valorGasto > 0 ? ((metrics.receitaGerada - valorGasto) / valorGasto) * 100 : null;
  return { custoPorLead, roi };
}
