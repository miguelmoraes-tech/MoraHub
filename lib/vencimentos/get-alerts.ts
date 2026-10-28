import { createClient } from "@/lib/supabase/server";
import { getWorkspaceIdAtivo } from "@/lib/empresa-ativa";
import { todayISO, diffInDays, nextOccurrence } from "@/lib/vencimentos/dates";
import type { VencimentoAlerta } from "@/lib/vencimentos/types";

const JANELA_DIAS = 3;

function pluralDias(dias: number) {
  return dias === 1 ? "1 dia" : `${dias} dias`;
}

function mensagemCobrar(dias: number, nome: string) {
  if (dias < 0) return `${nome} está atrasada há ${pluralDias(-dias)}`;
  if (dias === 0) return `${nome} cobra hoje`;
  return `Faltam ${pluralDias(dias)} para cobrar ${nome}`;
}

function mensagemVencer(dias: number, nome: string) {
  if (dias < 0) return `${nome} venceu há ${pluralDias(-dias)}`;
  if (dias === 0) return `${nome} vence hoje`;
  return `Faltam ${pluralDias(dias)} para vencer ${nome}`;
}

function mensagemFollowup(dias: number, nome: string) {
  if (dias < 0) return `Follow-up com ${nome} está atrasado há ${pluralDias(-dias)}`;
  if (dias === 0) return `Follow-up com ${nome} é hoje`;
  return `Faltam ${pluralDias(dias)} para o follow-up com ${nome}`;
}

type AssinaturaRow = {
  id: string;
  cliente_id: string;
  plano: string;
  proxima_cobranca: string;
};
type GastoRecorrenteRow = {
  id: string;
  nome: string;
  data: string;
  recorrencia: "Mensal" | "Anual";
};
type VencimentoRow = { id: string; titulo: string; data: string };
type ContratoRow = {
  id: string;
  cliente_id: string;
  descricao: string;
  vencimento: string;
};
type JuridicoRow = { id: string; titulo: string; prazo: string };
type ClienteRow = { id: string; nome: string };
type PropriedadeIntelectualRow = {
  id: string;
  cliente_id: string | null;
  nome: string;
  data_renovacao: string;
};
type FeriaRow = {
  id: string;
  funcionario_id: string;
  periodo_aquisitivo_fim: string;
};
type FuncionarioNomeRow = { id: string; nome: string };
type LeadFollowupRow = {
  id: string;
  nome: string;
  status: string;
  resultado: string | null;
  proximo_followup: string;
};

export async function getVencimentoAlertas(): Promise<VencimentoAlerta[]> {
  const supabase = await createClient();
  const hoje = todayISO();
  const workspaceId = await getWorkspaceIdAtivo();

  const [
    { data: assinaturas },
    { data: gastosFixos },
    { data: vencimentos },
    { data: contratos },
    { data: juridicos },
    { data: clientes },
    { data: propriedadesIntelectuais },
    { data: ferias },
    { data: funcionarios },
    { data: leadsFollowup },
  ] = (await Promise.all([
    supabase
      .from("assinaturas")
      .select("id, cliente_id, plano, proxima_cobranca")
      .eq("workspace_id", workspaceId ?? "")
      .eq("status", "ativa")
      .not("proxima_cobranca", "is", null),
    supabase
      .from("gastos")
      .select("id, nome, data, recorrencia")
      .eq("workspace_id", workspaceId ?? "")
      .eq("tipo", "fixo")
      .in("recorrencia", ["Mensal", "Anual"]),
    supabase.from("vencimentos").select("id, titulo, data"),
    supabase
      .from("contratos")
      .select("id, cliente_id, descricao, vencimento")
      .eq("workspace_id", workspaceId ?? "")
      .not("vencimento", "is", null),
    supabase
      .from("juridico")
      .select("id, titulo, prazo")
      .eq("status", "pendente")
      .not("prazo", "is", null),
    supabase.from("clientes").select("id, nome").eq("workspace_id", workspaceId ?? ""),
    supabase
      .from("propriedade_intelectual")
      .select("id, cliente_id, nome, data_renovacao")
      .not("data_renovacao", "is", null),
    supabase
      .from("ferias")
      .select("id, funcionario_id, periodo_aquisitivo_fim")
      .eq("status", "pendente")
      .not("periodo_aquisitivo_fim", "is", null),
    supabase.from("funcionarios").select("id, nome"),
    supabase
      .from("leads")
      .select("id, nome, status, resultado, proximo_followup")
      .eq("workspace_id", workspaceId ?? "")
      .not("proximo_followup", "is", null)
      .neq("status", "convertido"),
  ])) as [
    { data: AssinaturaRow[] | null },
    { data: GastoRecorrenteRow[] | null },
    { data: VencimentoRow[] | null },
    { data: ContratoRow[] | null },
    { data: JuridicoRow[] | null },
    { data: ClienteRow[] | null },
    { data: PropriedadeIntelectualRow[] | null },
    { data: FeriaRow[] | null },
    { data: FuncionarioNomeRow[] | null },
    { data: LeadFollowupRow[] | null },
  ];

  const clienteNome = new Map((clientes ?? []).map((c) => [c.id, c.nome]));
  const funcionarioNome = new Map((funcionarios ?? []).map((f) => [f.id, f.nome]));

  const alertas: VencimentoAlerta[] = [];

  for (const a of assinaturas ?? []) {
    const dias = diffInDays(hoje, a.proxima_cobranca);
    if (dias > JANELA_DIAS) continue;
    const nome = `assinatura de ${clienteNome.get(a.cliente_id) ?? "cliente"} (${a.plano})`;
    alertas.push({
      id: `assinatura-${a.id}`,
      tipo: "assinatura",
      data: a.proxima_cobranca,
      diasRestantes: dias,
      mensagem: mensagemCobrar(dias, nome),
    });
  }

  for (const g of gastosFixos ?? []) {
    const proxima = nextOccurrence(g.data, g.recorrencia, hoje);
    const dias = diffInDays(hoje, proxima);
    if (dias > JANELA_DIAS) continue;
    alertas.push({
      id: `gasto-${g.id}`,
      tipo: "gasto_fixo",
      data: proxima,
      diasRestantes: dias,
      mensagem: mensagemCobrar(dias, g.nome),
    });
  }

  for (const v of vencimentos ?? []) {
    const dias = diffInDays(hoje, v.data);
    if (dias > JANELA_DIAS) continue;
    alertas.push({
      id: `vencimento-${v.id}`,
      tipo: "vencimento",
      data: v.data,
      diasRestantes: dias,
      mensagem: mensagemVencer(dias, v.titulo),
    });
  }

  for (const c of contratos ?? []) {
    const dias = diffInDays(hoje, c.vencimento);
    if (dias > JANELA_DIAS) continue;
    const nome = `o contrato de ${clienteNome.get(c.cliente_id) ?? "cliente"} (${c.descricao})`;
    alertas.push({
      id: `contrato-${c.id}`,
      tipo: "contrato",
      data: c.vencimento,
      diasRestantes: dias,
      mensagem: mensagemVencer(dias, nome),
    });
  }

  for (const j of juridicos ?? []) {
    const dias = diffInDays(hoje, j.prazo);
    if (dias > JANELA_DIAS) continue;
    alertas.push({
      id: `juridico-${j.id}`,
      tipo: "juridico",
      data: j.prazo,
      diasRestantes: dias,
      mensagem: mensagemVencer(dias, j.titulo),
    });
  }

  for (const p of propriedadesIntelectuais ?? []) {
    const dias = diffInDays(hoje, p.data_renovacao);
    if (dias > JANELA_DIAS) continue;
    const nome = p.cliente_id
      ? `a renovação de ${p.nome} (${clienteNome.get(p.cliente_id) ?? "cliente"})`
      : `a renovação de ${p.nome}`;
    alertas.push({
      id: `propriedade_intelectual-${p.id}`,
      tipo: "propriedade_intelectual",
      data: p.data_renovacao,
      diasRestantes: dias,
      mensagem: mensagemVencer(dias, nome),
    });
  }

  for (const f of ferias ?? []) {
    const dias = diffInDays(hoje, f.periodo_aquisitivo_fim);
    if (dias > JANELA_DIAS) continue;
    const nome = `o período de férias de ${funcionarioNome.get(f.funcionario_id) ?? "funcionário"}`;
    alertas.push({
      id: `ferias-${f.id}`,
      tipo: "ferias",
      data: f.periodo_aquisitivo_fim,
      diasRestantes: dias,
      mensagem: mensagemVencer(dias, nome),
    });
  }

  for (const l of leadsFollowup ?? []) {
    if (l.resultado === "negou") continue;
    const dias = diffInDays(hoje, l.proximo_followup);
    if (dias > JANELA_DIAS) continue;
    alertas.push({
      id: `lead_followup-${l.id}`,
      tipo: "lead_followup",
      data: l.proximo_followup,
      diasRestantes: dias,
      mensagem: mensagemFollowup(dias, l.nome),
    });
  }

  return alertas.sort((a, b) => a.diasRestantes - b.diasRestantes);
}
