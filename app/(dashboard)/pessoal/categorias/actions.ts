"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PessoalCategoriaSchema } from "@/lib/validations/pessoal-categoria";
import type { ActionState } from "@/lib/actions/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function parseCategoriaForm(formData: FormData) {
  return PessoalCategoriaSchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
    color: formData.get("color"),
  });
}

export async function createPessoalCategoria(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseCategoriaForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase.from("pessoal_categories").insert({
    user_id: user.id,
    name: parsed.data.name,
    kind: parsed.data.kind,
    color: parsed.data.color,
  });
  if (error) return { error: "Não foi possível salvar a categoria." };

  revalidatePath("/pessoal/categorias");
  return { ok: true };
}

export async function updatePessoalCategoria(
  categoriaId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseCategoriaForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("pessoal_categories")
    .update({
      name: parsed.data.name,
      kind: parsed.data.kind,
      color: parsed.data.color,
    })
    .eq("id", categoriaId);
  if (error) return { error: "Não foi possível atualizar a categoria." };

  revalidatePath("/pessoal/categorias");
  return { ok: true };
}

export async function deletePessoalCategoria(categoriaId: string) {
  const { supabase } = await requireUser();
  await supabase.from("pessoal_categories").delete().eq("id", categoriaId);
  revalidatePath("/pessoal/categorias");
}
