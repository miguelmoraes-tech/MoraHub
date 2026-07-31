import { createClient } from "@/lib/supabase/server";
import type { ColaboradorPapel, Conversa } from "@/lib/types";

/** Conversas where the current user is the dono (account owner). */
export async function getConversasComoDono(): Promise<Conversa[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = (await supabase
    .from("conversas")
    .select("*")
    .eq("dono_id", user.id)) as { data: Conversa[] | null };
  return data ?? [];
}

/** Conversas where the current user is the membro (colaborador), optionally
 * scoped to one papel (a workspace only ever cares about its own papel). */
export async function getConversasComoMembro(
  papel?: ColaboradorPapel
): Promise<Conversa[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase.from("conversas").select("*").eq("membro_id", user.id);
  if (papel) query = query.eq("papel", papel);

  const { data } = (await query) as { data: Conversa[] | null };
  return data ?? [];
}

/** Unread count per conversa_id, for a given set of conversa ids the caller
 * already knows they participate in (RLS scopes the read regardless). */
export async function getUnreadCountsByConversa(
  conversaIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (conversaIds.length === 0) return counts;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return counts;

  const { data } = (await supabase
    .from("mensagens")
    .select("conversa_id")
    .in("conversa_id", conversaIds)
    .eq("lida", false)
    .neq("remetente_id", user.id)) as { data: { conversa_id: string }[] | null };

  for (const row of data ?? []) {
    counts.set(row.conversa_id, (counts.get(row.conversa_id) ?? 0) + 1);
  }
  return counts;
}

/** Total unread messages across every conversa the current user participates
 * in (as dono or as membro) — RLS already scopes "mensagens" to those rows. */
export async function getUnreadTotal(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from("mensagens")
    .select("id", { count: "exact", head: true })
    .eq("lida", false)
    .neq("remetente_id", user.id);

  return count ?? 0;
}
