"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { VencimentoSchema } from "@/lib/validations/vencimento";
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

function parseVencimentoForm(formData: FormData) {
  return VencimentoSchema.safeParse({
    titulo: formData.get("titulo"),
    data: formData.get("data"),
    nota: textOrNull(formData.get("nota")) ?? undefined,
  });
}

export async function createVencimento(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseVencimentoForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase.from("vencimentos").insert({
    user_id: user.id,
    titulo: parsed.data.titulo,
    data: parsed.data.data,
    nota: parsed.data.nota ?? null,
  });
  if (error) return { error: "Não foi possível salvar o vencimento." };

  revalidatePath("/calendario");
  return { ok: true };
}

export async function updateVencimento(
  vencimentoId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseVencimentoForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("vencimentos")
    .update({
      titulo: parsed.data.titulo,
      data: parsed.data.data,
      nota: parsed.data.nota ?? null,
    })
    .eq("id", vencimentoId);
  if (error) return { error: "Não foi possível atualizar o vencimento." };

  revalidatePath("/calendario");
  return { ok: true };
}

export async function deleteVencimento(vencimentoId: string) {
  const { supabase } = await requireUser();
  await supabase.from("vencimentos").delete().eq("id", vencimentoId);
  revalidatePath("/calendario");
}
