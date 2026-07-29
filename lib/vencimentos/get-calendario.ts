import { createClient } from "@/lib/supabase/server";
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

export async function getCalendarioItems(): Promise<CalendarioItem[]> {
  const supabase = await createClient();

  const [
    { data: vencimentos },
    { data: clientesComAssinatura },
    { data: contratos },
    { data: juridicos },
    { data: assinaturas },
    { data: clientes },
  ] = (await Promise.all([
    supabase.from("vencimentos").select("id, titulo, data, nota"),
    supabase
      .from("clientes")
      .select("id, nome, assinatura_ativa, assinatura_plano, assinatura_vencimento")
      .eq("assinatura_ativa", true)
      .not("assinatura_vencimento", "is", null),
    supabase
      .from("contratos")
      .select("id, cliente_id, descricao, vencimento")
      .not("vencimento", "is", null),
    supabase
      .from("juridico")
      .select("id, titulo, tipo, prazo")
      .eq("status", "pendente")
      .not("prazo", "is", null),
    supabase
      .from("assinaturas")
      .select("id, cliente_id, plano, proxima_cobranca")
      .eq("status", "ativa")
      .not("proxima_cobranca", "is", null),
    supabase.from("clientes").select("id, nome"),
  ])) as [
    { data: VencimentoRow[] | null },
    { data: ClienteAssinaturaRow[] | null },
    { data: ContratoRow[] | null },
    { data: JuridicoRow[] | null },
    { data: AssinaturaRow[] | null },
    { data: ClienteRow[] | null },
  ];

  const clienteNome = new Map((clientes ?? []).map((c) => [c.id, c.nome]));

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

  return itens.sort((a, b) => a.data.localeCompare(b.data));
}
