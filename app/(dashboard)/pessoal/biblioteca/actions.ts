"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PessoalBibliotecaSchema } from "@/lib/validations/pessoal-biblioteca";
import { inputToTags } from "@/lib/pessoal/tags";
import type { ActionState } from "@/lib/actions/types";
import type { PessoalLibraryItemStatus } from "@/lib/pessoal/types";

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

function parseBibliotecaForm(formData: FormData) {
  return PessoalBibliotecaSchema.safeParse({
    item_type: formData.get("item_type") ?? "link",
    title: textOrNull(formData.get("title")) ?? undefined,
    url: textOrNull(formData.get("url")) ?? undefined,
    thumbnail_url: textOrNull(formData.get("thumbnail_url")) ?? undefined,
    tags: textOrNull(formData.get("tags")) ?? undefined,
    notes: textOrNull(formData.get("notes")) ?? undefined,
    project_id: textOrNull(formData.get("project_id")) ?? undefined,
  });
}

export async function createPessoalBiblioteca(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseBibliotecaForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase.from("pessoal_library_items").insert({
    user_id: user.id,
    item_type: parsed.data.item_type,
    title: parsed.data.title ?? null,
    url: parsed.data.url ?? null,
    thumbnail_url: parsed.data.thumbnail_url ?? null,
    status: "para_ver",
    tags: parsed.data.tags ? inputToTags(parsed.data.tags) : [],
    notes: parsed.data.notes ?? null,
    project_id: parsed.data.project_id ?? null,
  });
  if (error) return { error: "Não foi possível salvar o item." };

  revalidatePath("/pessoal/biblioteca");
  return { ok: true };
}

export async function updatePessoalBiblioteca(
  itemId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseBibliotecaForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("pessoal_library_items")
    .update({
      item_type: parsed.data.item_type,
      title: parsed.data.title ?? null,
      url: parsed.data.url ?? null,
      thumbnail_url: parsed.data.thumbnail_url ?? null,
      tags: parsed.data.tags ? inputToTags(parsed.data.tags) : [],
      notes: parsed.data.notes ?? null,
      project_id: parsed.data.project_id ?? null,
    })
    .eq("id", itemId);
  if (error) return { error: "Não foi possível atualizar o item." };

  revalidatePath("/pessoal/biblioteca");
  return { ok: true };
}

export async function updatePessoalBibliotecaStatus(
  itemId: string,
  status: PessoalLibraryItemStatus
) {
  const { supabase } = await requireUser();
  await supabase
    .from("pessoal_library_items")
    .update({ status })
    .eq("id", itemId);
  revalidatePath("/pessoal/biblioteca");
}

export async function deletePessoalBiblioteca(itemId: string) {
  const { supabase } = await requireUser();
  await supabase.from("pessoal_library_items").delete().eq("id", itemId);
  revalidatePath("/pessoal/biblioteca");
}
