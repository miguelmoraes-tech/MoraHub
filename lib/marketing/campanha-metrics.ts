import type { createClient } from "@/lib/supabase/server";
import { getWorkspaceIdPadrao } from "@/lib/workspace";
import type { CampanhaMetrics } from "@/lib/marketing/campanha-metrics-shared";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

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

  const workspaceId = await getWorkspaceIdPadrao(donoId, "empresarial");

  const [{ data: leads }, { data: clientes }] = (await Promise.all([
    supabase
      .from("leads")
      .select("id, campanha_id, status")
      .eq("workspace_id", workspaceId ?? "")
      .in("campanha_id", campanhaIds),
    supabase
      .from("clientes")
      .select("id, lead_origem_id")
      .eq("workspace_id", workspaceId ?? "")
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
