import { createClient } from "@/lib/supabase/server";
import { getColaboradoresDaEmpresa } from "@/lib/colaboradores";
import { getWorkspaceIdAtivo } from "@/lib/empresa-ativa";
import { getModulosHabilitados } from "@/lib/modulos/habilitados";
import { isFollowupPendente } from "@/lib/leads";
import { todayISO } from "@/lib/vencimentos/dates";
import { RESUMO_P3D_VAZIO, getResumoImpressao3d, type ResumoImpressao3d } from "@/lib/impressao-3d/resumo";
import { lerFatosPassos, modulosOpcionaisFaltando, montarPassos, todosConcluidos, type Passo } from "@/lib/impressao-3d/primeiros-passos";
import { getConfigEmpresa } from "@/lib/rotulos";
import { getAbasVisiveis } from "@/lib/modulos/preferencias-servidor";
import { ABAS_VISAO_GERAL, CHAVE_VISAO_GERAL } from "@/lib/modulos/registry";
import type {
  AtividadeVendedorRow,
  ColaboradorVinculado,
  Lead,
} from "@/lib/types";

/**
 * Números da home do dono, só dos módulos ligados na empresa (workspace_modulos):
 * módulo desligado não gera consulta. O Dashboard Executivo completo
 * (lib/dashboard-executivo) continua no repositório, sem uso.
 */
export interface DashboardHomeOverview {
  /** A conta tem empresa própria? Sem ela não há módulos para resumir. */
  temEmpresa: boolean;
  /** Módulos ligados da empresa. */
  habilitados: string[];
  leads: {
    total: number;
    aAbordar: number;
    abordados: number;
    convertidos: number;
    followupsPendentes: number;
  };
  renegados: { total: number };
  clientes: { total: number; ativos: number };
  agenda: { proximos7Dias: number; hoje: number };
  vendedores: { ativos: number; solicitacoesPendentes: number };
  atividade: { vendedoresAtivos: number; leadsAbertos: number; aberturas: number };
  // Módulos novos: só contagens (sem valores), só quando o módulo está ligado.
  marketing: { campanhasAtivas: number; conteudoPlanejado: number };
  financeiro: { contasPagarAbertas: number; contasReceberAbertas: number };
  rh: { funcionariosAtivos: number; vagasAbertas: number };
  juridico: { processosAbertos: number; compliancePendente: number };
  /** Nicho Impressão 3D: só contagens, só dos módulos p3d_* ligados. */
  impressao3d: ResumoImpressao3d;
  /**
   * "Primeiros passos" (empresa com nicho Impressão 3D), por dados reais. null = outro nicho,
   * tudo concluído ou seção oculta na preferência de navegação.
   */
  primeirosPassos: Passo[] | null;
  /** Módulos opcionais do nicho ainda desligados (cartão "Precisa de mais?"); vazio = sem cartão. */
  maisModulos: string[];
  /** Seções visíveis da Visão Geral (preferência de navegação, chave "visao_geral"). */
  secoes: string[];
}

const DIAS_ATIVIDADE = 7;

const VAZIO: DashboardHomeOverview = {
  temEmpresa: false,
  habilitados: [],
  leads: { total: 0, aAbordar: 0, abordados: 0, convertidos: 0, followupsPendentes: 0 },
  renegados: { total: 0 },
  clientes: { total: 0, ativos: 0 },
  agenda: { proximos7Dias: 0, hoje: 0 },
  vendedores: { ativos: 0, solicitacoesPendentes: 0 },
  atividade: { vendedoresAtivos: 0, leadsAbertos: 0, aberturas: 0 },
  marketing: { campanhasAtivas: 0, conteudoPlanejado: 0 },
  financeiro: { contasPagarAbertas: 0, contasReceberAbertas: 0 },
  rh: { funcionariosAtivos: 0, vagasAbertas: 0 },
  juridico: { processosAbertos: 0, compliancePendente: 0 },
  impressao3d: RESUMO_P3D_VAZIO,
  primeirosPassos: null,
  maisModulos: [],
  secoes: ABAS_VISAO_GERAL.map((a) => a.chave),
};

export async function getDashboardHomeOverview(): Promise<DashboardHomeOverview> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return VAZIO;

  const workspaceId = await getWorkspaceIdAtivo();
  if (!workspaceId) return VAZIO;

  const habilitados = await getModulosHabilitados(workspaceId);
  const com = (chave: string) => habilitados.includes(chave);
  const nada = Promise.resolve({ data: null, count: 0 });

  const hoje = todayISO();
  const agora = new Date();
  const fimJanela = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000);
  const fimDoDia = new Date(agora);
  fimDoDia.setHours(23, 59, 59, 999);

  const [
    leadsRes,
    renegadosRes,
    clientesRes,
    reunioesRes,
    colaboradoresRes,
    solicitacoesRes,
    atividadeRes,
    campanhasRes,
    conteudoRes,
    contasPagarRes,
    contasReceberRes,
    funcionariosRes,
    vagasRes,
    processosRes,
    complianceRes,
  ] = await Promise.all([
    com("leads")
      ? supabase
          .from("leads")
          .select("status, resultado, proximo_followup")
          .eq("workspace_id", workspaceId)
      : nada,
    com("renegados")
      ? supabase
          .from("renegados")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
      : nada,
    com("clientes")
      ? supabase.from("clientes").select("status").eq("workspace_id", workspaceId)
      : nada,
    com("agenda")
      ? supabase
          .from("reunioes")
          .select("data_hora")
          .eq("workspace_id", workspaceId)
          .eq("status", "agendada")
          .gte("data_hora", agora.toISOString())
          .lte("data_hora", fimJanela.toISOString())
      : nada,
    com("vendedores")
      ? getColaboradoresDaEmpresa(supabase, workspaceId).then((data) => ({ data }))
      : nada,
    com("vendedores")
      ? supabase
          .from("solicitacoes_vendedor")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .eq("status", "pendente")
          // Pedido de cofundador não é pedido de vendedor.
          .or("papel_solicitado.is.null,papel_solicitado.neq.cofundador")
      : nada,
    com("vendedores")
      ? supabase.rpc("relatorio_atividade_vendedores", {
          p_workspace_id: workspaceId,
          p_dias: DIAS_ATIVIDADE,
        })
      : nada,
    com("marketing")
      ? supabase
          .from("campanhas")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .eq("status", "ativa")
      : nada,
    com("marketing")
      ? supabase
          .from("calendario_conteudo")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .in("status", ["planejado", "em_producao", "agendado"])
      : nada,
    com("financeiro")
      ? supabase
          .from("contas_pagar")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .neq("status", "pago")
      : nada,
    com("financeiro")
      ? supabase
          .from("contas_receber")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .neq("status", "recebido")
      : nada,
    com("rh")
      ? supabase
          .from("funcionarios")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .eq("status", "ativo")
      : nada,
    com("rh")
      ? supabase
          .from("vagas")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .eq("status", "aberta")
      : nada,
    com("juridico")
      ? supabase
          .from("processos")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .neq("fase", "encerrado")
      : nada,
    com("juridico")
      ? supabase
          .from("compliance_juridico")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .neq("status", "conforme")
      : nada,
  ]);

  const [impressao3d, config, secoes] = await Promise.all([
    getResumoImpressao3d(supabase, workspaceId, habilitados),
    getConfigEmpresa(),
    getAbasVisiveis(CHAVE_VISAO_GERAL),
  ]);
  let primeirosPassos: Passo[] | null = null;
  const maisModulos = config.nichoChave === "impressao_3d" ? modulosOpcionaisFaltando(habilitados) : [];
  if (config.nichoChave === "impressao_3d" && secoes.includes("primeiros_passos")) {
    const passos = montarPassos(await lerFatosPassos(supabase, workspaceId, habilitados), habilitados);
    primeirosPassos = todosConcluidos(passos) ? null : passos;
  }

  const leads = (leadsRes.data ?? []) as Pick<
    Lead,
    "status" | "resultado" | "proximo_followup"
  >[];
  const clientes = (clientesRes.data ?? []) as { status: string }[];
  const reunioes = (reunioesRes.data ?? []) as { data_hora: string }[];
  const colaboradores = (colaboradoresRes.data ?? []) as ColaboradorVinculado[];
  const atividade = (atividadeRes.data ?? []) as AtividadeVendedorRow[];

  return {
    temEmpresa: true,
    habilitados,
    leads: {
      total: leads.length,
      aAbordar: leads.filter((l) => l.status === "abordar").length,
      abordados: leads.filter((l) => l.status === "abordado").length,
      convertidos: leads.filter((l) => l.status === "convertido").length,
      followupsPendentes: leads.filter((l) => isFollowupPendente(l, hoje)).length,
    },
    renegados: { total: renegadosRes.count ?? 0 },
    clientes: {
      total: clientes.length,
      ativos: clientes.filter((c) => c.status === "ativo").length,
    },
    agenda: {
      proximos7Dias: reunioes.length,
      hoje: reunioes.filter((r) => new Date(r.data_hora) <= fimDoDia).length,
    },
    vendedores: {
      ativos: colaboradores.filter((c) => c.papel === "comercial").length,
      solicitacoesPendentes: solicitacoesRes.count ?? 0,
    },
    atividade: {
      vendedoresAtivos: new Set(atividade.map((a) => a.vendedor_id)).size,
      leadsAbertos: new Set(atividade.map((a) => a.lead_id)).size,
      aberturas: atividade.reduce((soma, a) => soma + a.aberturas, 0),
    },
    marketing: {
      campanhasAtivas: campanhasRes.count ?? 0,
      conteudoPlanejado: conteudoRes.count ?? 0,
    },
    financeiro: {
      contasPagarAbertas: contasPagarRes.count ?? 0,
      contasReceberAbertas: contasReceberRes.count ?? 0,
    },
    rh: { funcionariosAtivos: funcionariosRes.count ?? 0, vagasAbertas: vagasRes.count ?? 0 },
    juridico: {
      processosAbertos: processosRes.count ?? 0,
      compliancePendente: complianceRes.count ?? 0,
    },
    impressao3d,
    primeirosPassos,
    maisModulos,
    secoes,
  };
}
