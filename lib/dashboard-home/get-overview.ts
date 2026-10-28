import { createClient } from "@/lib/supabase/server";
import { getColaboradoresDaEmpresa } from "@/lib/colaboradores";
import { getWorkspaceIdAtivo } from "@/lib/empresa-ativa";
import { getModulosHabilitados } from "@/lib/modulos/habilitados";
import { isFollowupPendente } from "@/lib/leads";
import { todayISO } from "@/lib/vencimentos/dates";
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
      : nada,
    com("vendedores")
      ? supabase.rpc("relatorio_atividade_vendedores", {
          p_workspace_id: workspaceId,
          p_dias: DIAS_ATIVIDADE,
        })
      : nada,
  ]);

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
  };
}
