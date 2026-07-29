"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { inputToTags } from "@/lib/pessoal/tags";
import type { ActionState } from "@/lib/actions/types";

function textOrNull(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const str = value.toString().trim();
  return str === "" ? null : str;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function createPessoalInboxItem(content: string) {
  const trimmed = content.trim();
  if (!trimmed) return;

  const { supabase, user } = await requireUser();
  if (!user) return;

  await supabase.from("pessoal_inbox").insert({
    user_id: user.id,
    content: trimmed,
  });

  revalidatePath("/pessoal/inbox");
  revalidatePath("/pessoal");
}

export async function markPessoalInboxTriaged(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("pessoal_inbox").update({ is_triaged: true }).eq("id", id);
  revalidatePath("/pessoal/inbox");
  revalidatePath("/pessoal");
}

export async function deletePessoalInboxItem(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("pessoal_inbox").delete().eq("id", id);
  revalidatePath("/pessoal/inbox");
  revalidatePath("/pessoal");
}

/** Salva o item de Biblioteca convertido a partir do Inbox e marca o item de origem como triado. */
export async function createPessoalBibliotecaFromInbox(
  inboxId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const itemType = (formData.get("item_type") as string) || "link";
  const title = textOrNull(formData.get("title"));
  const url = textOrNull(formData.get("url"));
  const thumbnailUrl = textOrNull(formData.get("thumbnail_url"));
  const tags = textOrNull(formData.get("tags"));
  const notes = textOrNull(formData.get("notes"));
  const projectId = textOrNull(formData.get("project_id"));

  const { error } = await supabase.from("pessoal_library_items").insert({
    user_id: user.id,
    item_type: itemType,
    title,
    url,
    thumbnail_url: thumbnailUrl,
    status: "para_ver",
    tags: tags ? inputToTags(tags) : [],
    notes,
    project_id: projectId,
  });
  if (error) return { error: "Não foi possível salvar o item." };

  await supabase.from("pessoal_inbox").update({ is_triaged: true }).eq("id", inboxId);

  revalidatePath("/pessoal/inbox");
  revalidatePath("/pessoal/biblioteca");
  revalidatePath("/pessoal");
  return { ok: true };
}
