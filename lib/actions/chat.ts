"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Conversa } from "@/lib/types";

/**
 * Marks every unread message in a conversa (not authored by the caller) as
 * read. Called both when a chat is opened and whenever a new incoming
 * message arrives while it's already open.
 */
export async function marcarConversaComoLida(conversaId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("mensagens")
    .update({ lida: true })
    .eq("conversa_id", conversaId)
    .eq("lida", false)
    .neq("remetente_id", user.id);

  const { data: conversa } = (await supabase
    .from("conversas")
    .select("*")
    .eq("id", conversaId)
    .maybeSingle()) as { data: Conversa | null };
  if (!conversa) return;

  // Best-effort refresh of every list page that shows an unread badge for
  // this conversa, so counts aren't stale when the user navigates back.
  if (user.id === conversa.dono_id) {
    revalidatePath("/juridico");
    revalidatePath("/pessoal/juridico");
  } else {
    revalidatePath(`/colaborador/${conversa.papel}`);
    revalidatePath("/colaborador");
  }
}
