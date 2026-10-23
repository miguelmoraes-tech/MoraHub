import { createClient } from "@/lib/supabase/server";
import { getWorkspaceIdPadrao } from "@/lib/workspace";
import { isFollowupPendente } from "@/lib/leads";
import { todayISO } from "@/lib/vencimentos/dates";
import type {
  AtividadeVendedorRow,
  ColaboradorVinculado,
  Lead,
} from "@/lib/types";

/**
 * Números da home do dono, só dos módulos ligados em
 * lib/modulos-habilitados.ts (Leads, Renegados, Clientes, Agenda, Vendedores,
 * Atividade dos vendedores). O Dashboard Executivo completo
 * (lib/dashboard-executivo) continua no repositório, sem uso.
 */
export interface DashboardHomeOverview {
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

  const workspaceId = await getWorkspaceIdPadrao(user.id, "empresarial");
  if (!workspaceId) return VAZIO;

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
    supabase
      .from("leads")
      .select("status, resultado, proximo_followup")
      .eq("workspace_id", workspaceId),
    supabase
      .from("renegados")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId),
    supabase.from("clientes").select("status").eq("workspace_id", workspaceId),
    supabase
      .from("reunioes")
      .select("data_hora")
      .eq("workspace_id", workspaceId)
      .eq("status", "agendada")
      .gte("data_hora", agora.toISOString())
      .lte("data_hora", fimJanela.toISOString()),
    supabase.rpc("get_colaboradores_do_dono"),
    supabase
      .from("solicitacoes_vendedor")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "pendente"),
    supabase.rpc("relatorio_atividade_vendedores", {
      p_workspace_id: workspaceId,
      p_dias: DIAS_ATIVIDADE,
    }),
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
