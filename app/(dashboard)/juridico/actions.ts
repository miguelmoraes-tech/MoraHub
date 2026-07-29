"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { JuridicoSchema } from "@/lib/validations/juridico";
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

function parseJuridicoForm(formData: FormData) {
  return JuridicoSchema.safeParse({
    titulo: formData.get("titulo"),
    tipo: formData.get("tipo") ?? "Fiscal",
    prazo: textOrNull(formData.get("prazo")) ?? undefined,
    status: formData.get("status") ?? "pendente",
    nota: textOrNull(formData.get("nota")) ?? undefined,
  });
}

export async function createJuridico(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseJuridicoForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase.from("juridico").insert({
    user_id: user.id,
    titulo: parsed.data.titulo,
    tipo: parsed.data.tipo,
    prazo: parsed.data.prazo ?? null,
    status: parsed.data.status,
    nota: parsed.data.nota ?? null,
  });
  if (error) return { error: "Não foi possível salvar a pendência." };

  revalidatePath("/juridico");
  return { ok: true };
}

export async function updateJuridico(
  juridicoId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseJuridicoForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("juridico")
    .update({
      titulo: parsed.data.titulo,
      tipo: parsed.data.tipo,
      prazo: parsed.data.prazo ?? null,
      status: parsed.data.status,
      nota: parsed.data.nota ?? null,
    })
    .eq("id", juridicoId);
  if (error) return { error: "Não foi possível atualizar a pendência." };

  revalidatePath("/juridico");
  return { ok: true };
}

export async function deleteJuridico(juridicoId: string) {
  const { supabase } = await requireUser();
  await supabase.from("juridico").delete().eq("id", juridicoId);
  revalidatePath("/juridico");
}
