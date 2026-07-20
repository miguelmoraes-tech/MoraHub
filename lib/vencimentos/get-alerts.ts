import { createClient } from "@/lib/supabase/server";
import { todayISO, diffInDays, nextOccurrence } from "@/lib/vencimentos/dates";
import type { VencimentoAlerta } from "@/lib/vencimentos/types";

const JANELA_DIAS = 3;

function pluralDias(dias: number) {
  return dias === 1 ? "1 dia" : `${dias} dias`;
}

function mensagemCobrar(dias: number, nome: string) {
  if (dias === 0) return `${nome} cobra hoje`;
  return `Faltam ${pluralDias(dias)} para cobrar ${nome}`;
}

function mensagemVencer(dias: number, nome: string) {
  if (dias === 0) return `${nome} vence hoje`;
  return `Faltam ${pluralDias(dias)} para vencer ${nome}`;
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

export async function getVencimentoAlertas(): Promise<VencimentoAlerta[]> {
  const supabase = await createClient();
  const hoje = todayISO();

  const [
    { data: assinaturas },
    { data: gastosFixos },
    { data: vencimentos },
    { data: contratos },
    { data: juridicos },
    { data: clientes },
  ] = (await Promise.all([
    supabase
      .from("assinaturas")
      .select("id, cliente_id, plano, proxima_cobranca")
      .eq("status", "ativa")
      .not("proxima_cobranca", "is", null),
    supabase
      .from("gastos")
      .select("id, nome, data, recorrencia")
      .eq("tipo", "fixo")
      .in("recorrencia", ["Mensal", "Anual"]),
    supabase.from("vencimentos").select("id, titulo, data"),
    supabase
      .from("contratos")
      .select("id, cliente_id, descricao, vencimento")
      .not("vencimento", "is", null),
    supabase
      .from("juridico")
      .select("id, titulo, prazo")
      .eq("status", "pendente")
      .not("prazo", "is", null),
    supabase.from("clientes").select("id, nome"),
  ])) as [
    { data: AssinaturaRow[] | null },
    { data: GastoRecorrenteRow[] | null },
    { data: VencimentoRow[] | null },
    { data: ContratoRow[] | null },
    { data: JuridicoRow[] | null },
    { data: ClienteRow[] | null },
  ];

  const clienteNome = new Map((clientes ?? []).map((c) => [c.id, c.nome]));

  const alertas: VencimentoAlerta[] = [];

  for (const a of assinaturas ?? []) {
    const dias = diffInDays(hoje, a.proxima_cobranca);
    if (dias < 0 || dias > JANELA_DIAS) continue;
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
    if (dias < 0 || dias > JANELA_DIAS) continue;
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
    if (dias < 0 || dias > JANELA_DIAS) continue;
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
    if (dias < 0 || dias > JANELA_DIAS) continue;
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
    if (dias < 0 || dias > JANELA_DIAS) continue;
    alertas.push({
      id: `juridico-${j.id}`,
      tipo: "juridico",
      data: j.prazo,
      diasRestantes: dias,
      mensagem: mensagemVencer(dias, j.titulo),
    });
  }

  return alertas.sort((a, b) => a.diasRestantes - b.diasRestantes);
}
