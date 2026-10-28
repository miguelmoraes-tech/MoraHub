import type { Campanha } from "@/lib/types";

/**
 * Pure types/helpers shared between server pages and the client campanhas
 * board. Kept separate from lib/marketing/campanha-metrics.ts, which
 * imports lib/workspace.ts (and therefore lib/supabase/server / next/headers)
 * and can't be reached from any client component's import graph.
 */

/**
 * `null` = a pessoa não tem permissão no módulo de onde o número vem (leads,
 * clientes ou financeiro): a tela mostra "—", nunca zero.
 */
export interface CampanhaMetrics {
  leadsGerados: number | null;
  clientesConvertidos: number | null;
  receitaGerada: number | null;
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

/** Custo por lead e ROI (%), derivados de valor_gasto + métricas agregadas. */
export function computeCampanhaDerived(
  campanha: Pick<Campanha, "valor_gasto">,
  metrics: CampanhaMetrics = METRICS_VAZIO
): CampanhaDerived {
  const valorGasto = campanha.valor_gasto ?? 0;
  const custoPorLead =
    metrics.leadsGerados !== null && metrics.leadsGerados > 0
      ? valorGasto / metrics.leadsGerados
      : null;
  const roi =
    valorGasto > 0 && metrics.receitaGerada !== null
      ? ((metrics.receitaGerada - valorGasto) / valorGasto) * 100
      : null;
  return { custoPorLead, roi };
}
