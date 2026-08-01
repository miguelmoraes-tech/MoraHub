import { createClient } from "@/lib/supabase/server";
import type { ColaboradorParaAtribuicao, Ticket } from "@/lib/types";

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
