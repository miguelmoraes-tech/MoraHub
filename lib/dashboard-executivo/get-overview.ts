import { createClient } from "@/lib/supabase/server";
import { todayISO, diffInDays, recurringMonthKeysInWindow, subtractDaysISO } from "@/lib/vencimentos/dates";
import { getRHOverview, type RHOverview } from "@/lib/rh/get-overview";
import { getMarketingOverview, type MarketingOverview } from "@/lib/marketing/get-overview";
import { getSuporteData, computeSuporteOverview, nowMs, type SuporteOverview } from "@/lib/tickets";
import {
  getMetasOverview,
  getMetaResumoPorSetor,
  type MetasOverview,
  type MetaSetorResumo,
} from "@/lib/metas/get-overview";
import type { AssinaturaRecorrencia, Recorrencia } from "@/lib/types";

type ComprovanteRow = { valor: number | null };
type GastoRow = { valor: number; recorrencia: Recorrencia | null; data: string; tipo: string };
type ContaPagarRow = { valor: number; data_vencimento: string; status: string };
type ContaReceberRow = { valor: number; data_vencimento: string; status: string };
type AssinaturaRow = {
  valor: number | null;
  recorrencia: AssinaturaRecorrencia;
  proxima_cobranca: string | null;
  status: string;
};
type LeadRow = { status: string };
type ComplianceRow = { status: string };
type ProcessoRow = { fase: string; proximo_prazo: string | null };
type FechamentoRow = { status: string };
type ProjetoRow = { status: string };

export interface DashboardExecutivoOverview {
  financeiro: {
    saldoAtual: number;
    saldoProjetadoProximoMes: number;
    contasVencendoCount: number;
  };
  comercial: {
    leadsNoFunil: number;
    taxaConversao: number | null;
    meta: MetaSetorResumo | null;
  };
  marketing: MarketingOverview;
  juridico: {
    compliancePendenteCount: number;
    processosProximosCount: number;
    fechamentoMes: { total: number; concluidos: number };
  };
  rh: RHOverview;
  suporte: SuporteOverview;
  tecnica: { projetosAtivosCount: number; manutencoesRecentesCount: number };
  metas: MetasOverview;
}

const JANELA_CONTAS_DIAS = 7;
const JANELA_PROCESSOS_DIAS = 7;
const JANELA_MANUTENCOES_DIAS = 30;

export async function getDashboardExecutivoOverview(
  donoId: string | null
): Promise<DashboardExecutivoOverview> {
  const supabase = await createClient();
  const hoje = todayISO();
  const mesAtual = hoje.slice(0, 7);
  const mesAtualInicio = `${mesAtual}-01`;
  const [anoAtual, mesNum] = mesAtual.split("-").map(Number);
  const proximoMesKey =
    mesNum === 12 ? `${anoAtual + 1}-01` : `${anoAtual}-${String(mesNum + 1).padStart(2, "0")}`;

  if (!donoId) {
    const [rh, marketing, metas] = await Promise.all([
      getRHOverview(null),
      getMarketingOverview(null),
      getMetasOverview(null),
    ]);
    return {
      financeiro: { saldoAtual: 0, saldoProjetadoProximoMes: 0, contasVencendoCount: 0 },
      comercial: { leadsNoFunil: 0, taxaConversao: null, meta: null },
      marketing,
      juridico: {
        compliancePendenteCount: 0,
        processosProximosCount: 0,
        fechamentoMes: { total: 0, concluidos: 0 },
      },
      rh,
      suporte: {
        ticketsAbertos: 0,
        slaEstourados: 0,
        tempoMedioPrimeiraRespostaHoras: null,
        tempoMedioResolucaoHoras: null,
      },
      tecnica: { projetosAtivosCount: 0, manutencoesRecentesCount: 0 },
      metas,
    };
  }

  const [
    [
      { data: comprovantes },
      { data: gastos },
      { data: contasPagar },
      { data: contasReceber },
      { data: assinaturas },
      { data: leads },
      { data: compliance },
      { data: processos },
      { data: fechamentos },
      { data: projetos },
      { count: manutencoesRecentesCount },
    ],
    rh,
    marketing,
    metas,
    comercialMeta,
    { tickets: ticketsSuporte },
  ] = await Promise.all([
    Promise.all([
      supabase.from("comprovantes").select("valor").eq("user_id", donoId),
      supabase.from("gastos").select("valor, recorrencia, data, tipo").eq("user_id", donoId),
      supabase.from("contas_pagar").select("valor, data_vencimento, status").eq("user_id", donoId),
      supabase
        .from("contas_receber")
        .select("valor, data_vencimento, status")
        .eq("user_id", donoId),
      supabase
        .from("assinaturas")
        .select("valor, recorrencia, proxima_cobranca, status")
        .eq("user_id", donoId)
        .eq("status", "ativa"),
      supabase.from("leads").select("status").eq("user_id", donoId),
      supabase.from("compliance_juridico").select("status").eq("user_id", donoId),
      supabase.from("processos").select("fase, proximo_prazo").eq("user_id", donoId),
      supabase
        .from("fechamentos_mensais")
        .select("status")
        .eq("user_id", donoId)
        .eq("mes_referencia", mesAtualInicio),
      supabase.from("projetos").select("status").eq("user_id", donoId),
      supabase
        .from("manutencoes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", donoId)
        .gte("data", subtractDaysISO(hoje, JANELA_MANUTENCOES_DIAS)),
    ]) as unknown as Promise<
      [
        { data: ComprovanteRow[] | null },
        { data: GastoRow[] | null },
        { data: ContaPagarRow[] | null },
        { data: ContaReceberRow[] | null },
        { data: AssinaturaRow[] | null },
        { data: LeadRow[] | null },
        { data: ComplianceRow[] | null },
        { data: ProcessoRow[] | null },
        { data: FechamentoRow[] | null },
        { data: ProjetoRow[] | null },
        { count: number | null },
      ]
    >,
    getRHOverview(donoId),
    getMarketingOverview(donoId),
    getMetasOverview(donoId),
    getMetaResumoPorSetor(donoId, "comercial"),
    getSuporteData([donoId]),
  ]);

  // --- Financeiro ---
  const comprovantesList = comprovantes ?? [];
  const gastosList = gastos ?? [];
  const contasPagarList = contasPagar ?? [];
  const contasReceberList = contasReceber ?? [];
  const assinaturasList = assinaturas ?? [];

  const saldoAtual =
    comprovantesList.reduce((s, c) => s + (c.valor ?? 0), 0) -
    gastosList.reduce((s, g) => s + (g.valor ?? 0), 0);

  const contasReceberProximoMes = contasReceberList
    .filter((c) => c.status !== "atrasado" && c.data_vencimento.startsWith(proximoMesKey))
    .reduce((s, c) => s + c.valor, 0);
  const contasPagarProximoMes = contasPagarList
    .filter((c) => c.data_vencimento.startsWith(proximoMesKey))
    .reduce((s, c) => s + c.valor, 0);
  const assinaturasProximoMes = assinaturasList
    .filter(
      (a) => recurringMonthKeysInWindow(a.proxima_cobranca, a.recorrencia, [proximoMesKey]).length > 0
    )
    .reduce((s, a) => s + (a.valor ?? 0), 0);
  const gastosFixosProximoMes = gastosList
    .filter(
      (g) =>
        g.tipo === "fixo" &&
        recurringMonthKeysInWindow(g.data, g.recorrencia, [proximoMesKey]).length > 0
    )
    .reduce((s, g) => s + g.valor, 0);

  const saldoProjetadoProximoMes =
    saldoAtual +
    (contasReceberProximoMes + assinaturasProximoMes) -
    (contasPagarProximoMes + gastosFixosProximoMes);

  const contasPagarVencendo = contasPagarList.filter(
    (c) => c.status !== "pago" && diffInDays(hoje, c.data_vencimento) <= JANELA_CONTAS_DIAS
  ).length;
  const contasReceberVencendo = contasReceberList.filter(
    (c) => c.status !== "recebido" && diffInDays(hoje, c.data_vencimento) <= JANELA_CONTAS_DIAS
  ).length;

  // --- Comercial ---
  const leadsList = leads ?? [];
  const convertidos = leadsList.filter((l) => l.status === "convertido").length;

  // --- Jurídico & Contábil ---
  const complianceList = compliance ?? [];
  const processosList = processos ?? [];
  const fechamentosList = fechamentos ?? [];
  const processosProximosCount = processosList.filter((p) => {
    if (p.fase === "encerrado" || !p.proximo_prazo) return false;
    const dias = diffInDays(hoje, p.proximo_prazo);
    return dias >= 0 && dias <= JANELA_PROCESSOS_DIAS;
  }).length;

  // --- Central Técnica ---
  const projetosList = projetos ?? [];

  return {
    financeiro: {
      saldoAtual,
      saldoProjetadoProximoMes,
      contasVencendoCount: contasPagarVencendo + contasReceberVencendo,
    },
    comercial: {
      leadsNoFunil: leadsList.filter((l) => l.status !== "convertido").length,
      taxaConversao: leadsList.length > 0 ? convertidos / leadsList.length : null,
      meta: comercialMeta,
    },
    marketing,
    juridico: {
      compliancePendenteCount: complianceList.filter((c) => c.status !== "conforme").length,
      processosProximosCount,
      fechamentoMes: {
        total: fechamentosList.length,
        concluidos: fechamentosList.filter((f) => f.status === "concluido").length,
      },
    },
    rh,
    suporte: computeSuporteOverview(ticketsSuporte, nowMs()),
    tecnica: {
      projetosAtivosCount: projetosList.filter((p) => p.status === "em_andamento").length,
      manutencoesRecentesCount: manutencoesRecentesCount ?? 0,
    },
    metas,
  };
}
