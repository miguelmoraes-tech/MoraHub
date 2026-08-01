import { createClient } from "@/lib/supabase/server";
import type { ColaboradorParaAtribuicao, Ticket } from "@/lib/types";

/** Wraps Date.now() so page components never call an impure global directly. */
export function nowMs(): number {
  return Date.now();
}

const TICKETS_ABERTOS: readonly Ticket["status"][] = [
  "aberto",
  "em_andamento",
  "aguardando_cliente",
];

/** A ticket needs attention: not yet resolved/closed, and past its SLA window. */
export function isSlaEstourado(
  ticket: Pick<Ticket, "status" | "data_abertura" | "sla_horas">,
  nowMs: number
): boolean {
  if (ticket.status === "resolvido" || ticket.status === "fechado") return false;
  if (!ticket.sla_horas) return false;
  const horasPassadas =
    (nowMs - new Date(ticket.data_abertura).getTime()) / 3_600_000;
  return horasPassadas > ticket.sla_horas;
}

export interface SuporteOverview {
  ticketsAbertos: number;
  slaEstourados: number;
  tempoMedioPrimeiraRespostaHoras: number | null;
  tempoMedioResolucaoHoras: number | null;
}

function mediaEmHoras(
  tickets: Ticket[],
  campo: "data_primeira_resposta" | "data_resolucao"
): number | null {
  const comCampo = tickets.filter((t) => t[campo]);
  if (comCampo.length === 0) return null;
  const totalHoras = comCampo.reduce((soma, t) => {
    const abertura = new Date(t.data_abertura).getTime();
    const marco = new Date(t[campo] as string).getTime();
    return soma + (marco - abertura) / 3_600_000;
  }, 0);
  return totalHoras / comCampo.length;
}

/** Stat cards for the Visão Geral do Suporte — averages scoped to the last 30 days. */
export function computeSuporteOverview(
  tickets: Ticket[],
  nowMs: number
): SuporteOverview {
  const abertos = tickets.filter((t) => TICKETS_ABERTOS.includes(t.status));
  const slaEstourados = abertos.filter((t) => isSlaEstourado(t, nowMs)).length;

  const trintaDiasAtras = nowMs - 30 * 24 * 3_600_000;
  const recentes = tickets.filter(
    (t) => new Date(t.data_abertura).getTime() >= trintaDiasAtras
  );

  return {
    ticketsAbertos: abertos.length,
    slaEstourados,
    tempoMedioPrimeiraRespostaHoras: mediaEmHoras(recentes, "data_primeira_resposta"),
    tempoMedioResolucaoHoras: mediaEmHoras(recentes, "data_resolucao"),
  };
}

/** Tickets + clientes for one or more owner accounts (RLS-scoped either way). */
export async function getSuporteData(donoIds: string[]) {
  if (donoIds.length === 0) {
    return { tickets: [] as Ticket[], clientes: [] as { id: string; nome: string; user_id: string }[] };
  }

  const supabase = await createClient();
  const [{ data: tickets }, { data: clientes }] = (await Promise.all([
    supabase
      .from("tickets")
      .select("*")
      .in("user_id", donoIds)
      .order("data_abertura", { ascending: false }),
    supabase
      .from("clientes")
      .select("id, nome, user_id")
      .in("user_id", donoIds)
      .order("nome"),
  ])) as [
    { data: Ticket[] | null },
    { data: { id: string; nome: string; user_id: string }[] | null },
  ];

  return { tickets: tickets ?? [], clientes: clientes ?? [] };
}

/**
 * Team roster for the "responsável" picker. Only meaningful for a single
 * company at a time — when a colaborador (e.g. advogado/contador) is linked
 * to several, the roster is left empty rather than guessing which one.
 */
export async function getColaboradoresParaResponsavel(
  donoIds: string[]
): Promise<ColaboradorParaAtribuicao[]> {
  if (donoIds.length !== 1) return [];

  const supabase = await createClient();
  const { data } = (await supabase.rpc("get_colaboradores_do_dono_by_id", {
    p_dono_id: donoIds[0],
  })) as { data: ColaboradorParaAtribuicao[] | null };
  return data ?? [];
}
