import { createClient } from "@/lib/supabase/server";
import { getWorkspaceIdAtivo } from "@/lib/empresa-ativa";
import type { CalendarioItem } from "@/lib/vencimentos/types";

type ClienteAssinaturaRow = {
  id: string;
  nome: string;
  assinatura_ativa: boolean;
  assinatura_plano: string | null;
  assinatura_vencimento: string | null;
};
type ContratoRow = {
  id: string;
  cliente_id: string;
  descricao: string;
  vencimento: string;
};
type JuridicoRow = { id: string; titulo: string; tipo: string; prazo: string };
type AssinaturaRow = {
  id: string;
  cliente_id: string;
  plano: string;
  proxima_cobranca: string;
};
type VencimentoRow = {
  id: string;
  titulo: string;
  data: string;
  nota: string | null;
};
type ClienteRow = { id: string; nome: string };
type PropriedadeIntelectualRow = {
  id: string;
  cliente_id: string | null;
  nome: string;
  tipo: string;
  data_renovacao: string;
};
type FeriaRow = {
  id: string;
  funcionario_id: string;
  periodo_aquisitivo_fim: string;
};
type FuncionarioNomeRow = { id: string; nome: string };

export async function getCalendarioItems(): Promise<CalendarioItem[]> {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceIdAtivo();

  const [
    { data: vencimentos },
    { data: clientesComAssinatura },
    { data: contratos },
    { data: juridicos },
    { data: assinaturas },
    { data: clientes },
    { data: propriedadesIntelectuais },
    { data: ferias },
    { data: funcionarios },
  ] = (await Promise.all([
    supabase.from("vencimentos").select("id, titulo, data, nota"),
    supabase
      .from("clientes")
      .select("id, nome, assinatura_ativa, assinatura_plano, assinatura_vencimento")
      .eq("workspace_id", workspaceId ?? "")
      .eq("assinatura_ativa", true)
      .not("assinatura_vencimento", "is", null),
    supabase
      .from("contratos")
      .select("id, cliente_id, descricao, vencimento")
      .eq("workspace_id", workspaceId ?? "")
      .not("vencimento", "is", null),
    supabase
      .from("juridico")
      .select("id, titulo, tipo, prazo")
      .eq("status", "pendente")
      .not("prazo", "is", null),
    supabase
      .from("assinaturas")
      .select("id, cliente_id, plano, proxima_cobranca")
      .eq("workspace_id", workspaceId ?? "")
      .eq("status", "ativa")
      .not("proxima_cobranca", "is", null),
    supabase.from("clientes").select("id, nome").eq("workspace_id", workspaceId ?? ""),
    supabase
      .from("propriedade_intelectual")
      .select("id, cliente_id, nome, tipo, data_renovacao")
      .not("data_renovacao", "is", null),
    supabase
      .from("ferias")
      .select("id, funcionario_id, periodo_aquisitivo_fim")
      .eq("workspace_id", workspaceId ?? "")
      .eq("status", "pendente")
      .not("periodo_aquisitivo_fim", "is", null),
    supabase.from("funcionarios").select("id, nome").eq("workspace_id", workspaceId ?? ""),
  ])) as [
    { data: VencimentoRow[] | null },
    { data: ClienteAssinaturaRow[] | null },
    { data: ContratoRow[] | null },
    { data: JuridicoRow[] | null },
    { data: AssinaturaRow[] | null },
    { data: ClienteRow[] | null },
    { data: PropriedadeIntelectualRow[] | null },
    { data: FeriaRow[] | null },
    { data: FuncionarioNomeRow[] | null },
  ];

  const clienteNome = new Map((clientes ?? []).map((c) => [c.id, c.nome]));
  const funcionarioNome = new Map((funcionarios ?? []).map((f) => [f.id, f.nome]));

  const itens: CalendarioItem[] = [];

  for (const v of vencimentos ?? []) {
    itens.push({
      id: v.id,
      tipo: "vencimento",
      titulo: v.titulo,
      data: v.data,
      nota: v.nota,
      href: null,
    });
  }

  for (const c of clientesComAssinatura ?? []) {
    if (!c.assinatura_vencimento) continue;
    itens.push({
      id: `assinatura_cliente-${c.id}`,
      tipo: "assinatura_cliente",
      titulo: c.assinatura_plano
        ? `Assinatura de ${c.nome} (${c.assinatura_plano})`
        : `Assinatura de ${c.nome}`,
      data: c.assinatura_vencimento,
      nota: null,
      href: `/clientes/${c.id}`,
    });
  }

  for (const c of contratos ?? []) {
    itens.push({
      id: `contrato-${c.id}`,
      tipo: "contrato",
      titulo: `Contrato: ${c.descricao} (${clienteNome.get(c.cliente_id) ?? "cliente"})`,
      data: c.vencimento,
      nota: null,
      href: `/clientes/${c.cliente_id}`,
    });
  }

  for (const j of juridicos ?? []) {
    itens.push({
      id: `juridico-${j.id}`,
      tipo: "juridico",
      titulo: `${j.titulo} (${j.tipo})`,
      data: j.prazo,
      nota: null,
      href: "/juridico",
    });
  }

  for (const a of assinaturas ?? []) {
    itens.push({
      id: `assinatura-${a.id}`,
      tipo: "assinatura",
      titulo: `${a.plano} — ${clienteNome.get(a.cliente_id) ?? "cliente"}`,
      data: a.proxima_cobranca,
      nota: null,
      href: `/clientes/${a.cliente_id}`,
    });
  }

  for (const p of propriedadesIntelectuais ?? []) {
    itens.push({
      id: `propriedade_intelectual-${p.id}`,
      tipo: "propriedade_intelectual",
      titulo: p.cliente_id
        ? `Renovação: ${p.nome} (${p.tipo}) — ${clienteNome.get(p.cliente_id) ?? "cliente"}`
        : `Renovação: ${p.nome} (${p.tipo})`,
      data: p.data_renovacao,
      nota: null,
      href: p.cliente_id ? `/clientes/${p.cliente_id}` : null,
    });
  }

  for (const f of ferias ?? []) {
    itens.push({
      id: `ferias-${f.id}`,
      tipo: "ferias",
      titulo: `Férias: ${funcionarioNome.get(f.funcionario_id) ?? "funcionário"}`,
      data: f.periodo_aquisitivo_fim,
      nota: null,
      href: "/rh/ferias",
    });
  }

  return itens.sort((a, b) => a.data.localeCompare(b.data));
}
