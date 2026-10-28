import { createClient } from "@/lib/supabase/server";
import { getWorkspaceIdAtivo } from "@/lib/empresa-ativa";
import { todayISO } from "@/lib/vencimentos/dates";
import { getCampanhaMetricsMap } from "@/lib/marketing/campanha-metrics";
import { computeCampanhaDerived } from "@/lib/marketing/campanha-metrics-shared";
import type { Campanha } from "@/lib/types";

type ConteudoRow = { id: string; data_publicacao: string | null; status: string };

export interface MarketingOverview {
  conteudoPublicadoSemana: number;
  conteudoPublicadoMes: number;
  campanhasAtivasCount: number;
  totalInvestidoMes: number;
  roiMedioAtivas: number | null;
}

const VAZIO: MarketingOverview = {
  conteudoPublicadoSemana: 0,
  conteudoPublicadoMes: 0,
  campanhasAtivasCount: 0,
  totalInvestidoMes: 0,
  roiMedioAtivas: null,
};

function ultimoDiaDoMes(mesAtual: string) {
  const [ano, mes] = mesAtual.split("-").map(Number);
  return new Date(Date.UTC(ano, mes, 0)).toISOString().slice(0, 10);
}

export async function getMarketingOverview(donoId: string | null): Promise<MarketingOverview> {
  const workspaceId = await getWorkspaceIdAtivo();
  if (!donoId || !workspaceId) return VAZIO;

  const supabase = await createClient();
  const hoje = todayISO();
  const mesAtual = hoje.slice(0, 7);
  const primeiroDiaMes = `${mesAtual}-01`;
  const ultimoDiaMes = ultimoDiaDoMes(mesAtual);
  const seteDiasAtras = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [{ data: conteudos }, { data: campanhas }] = (await Promise.all([
    supabase
      .from("calendario_conteudo")
      .select("id, data_publicacao, status")
      .eq("user_id", donoId)
      .eq("status", "publicado"),
    supabase.from("campanhas").select("*").eq("workspace_id", workspaceId),
  ])) as [{ data: ConteudoRow[] | null }, { data: Campanha[] | null }];

  const conteudosList = conteudos ?? [];
  const conteudoPublicadoMes = conteudosList.filter((c) =>
    (c.data_publicacao ?? "").startsWith(mesAtual)
  ).length;
  const conteudoPublicadoSemana = conteudosList.filter(
    (c) => c.data_publicacao && c.data_publicacao >= seteDiasAtras && c.data_publicacao <= hoje
  ).length;

  const campanhasList = campanhas ?? [];
  const campanhasAtivas = campanhasList.filter((c) => c.status === "ativa");

  const totalInvestidoMes = campanhasList
    .filter(
      (c) => (c.data_inicio ?? "") <= ultimoDiaMes && (!c.data_fim || c.data_fim >= primeiroDiaMes)
    )
    .reduce((sum, c) => sum + (c.valor_gasto ?? 0), 0);

  const metricsMap = await getCampanhaMetricsMap(
    supabase,
    donoId,
    campanhasAtivas.map((c) => c.id)
  );
  const roisAtivas = campanhasAtivas
    .map((c) => computeCampanhaDerived(c, metricsMap.get(c.id)).roi)
    .filter((roi): roi is number => roi !== null);
  const roiMedioAtivas =
    roisAtivas.length > 0 ? roisAtivas.reduce((a, b) => a + b, 0) / roisAtivas.length : null;

  return {
    conteudoPublicadoSemana,
    conteudoPublicadoMes,
    campanhasAtivasCount: campanhasAtivas.length,
    totalInvestidoMes,
    roiMedioAtivas,
  };
}
