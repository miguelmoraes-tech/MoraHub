"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { JuridicoSchema } from "@/lib/validations/juridico";
import type { ActionState } from "@/lib/actions/types";
import type { JuridicoTipo } from "@/lib/types";

function textOrNull(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const str = value.toString().trim();
  return str === "" ? null : str;
}

function parseForm(formData: FormData, tipo: JuridicoTipo) {
  return JuridicoSchema.safeParse({
    titulo: formData.get("titulo"),
    tipo,
    prazo: textOrNull(formData.get("prazo")) ?? undefined,
    status: formData.get("status") ?? "pendente",
    nota: textOrNull(formData.get("nota")) ?? undefined,
  });
}

export async function createJuridicoColaborador(
  donoId: string,
  tipo: JuridicoTipo,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData, tipo);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("juridico").insert({
    user_id: donoId,
    titulo: parsed.data.titulo,
    tipo: parsed.data.tipo,
    prazo: parsed.data.prazo ?? null,
    status: parsed.data.status,
    nota: parsed.data.nota ?? null,
  });
  // RLS silently scopes this to accounts the caller actually collaborates on
  // (see the "dono ou colaborador vinculado" policy on `juridico`) — a
  // tampered donoId simply fails here rather than needing an app-side check.
  if (error) return { error: "Não foi possível salvar a pendência." };

  revalidatePath("/colaborador/juridico");
  return { ok: true };
}

export async function updateJuridicoColaborador(
  juridicoId: string,
  tipo: JuridicoTipo,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData, tipo);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("juridico")
    .update({
      titulo: parsed.data.titulo,
      prazo: parsed.data.prazo ?? null,
      status: parsed.data.status,
      nota: parsed.data.nota ?? null,
    })
    .eq("id", juridicoId);
  if (error) return { error: "Não foi possível atualizar a pendência." };

  revalidatePath("/colaborador/juridico");
  return { ok: true };
}

export async function deleteJuridicoColaborador(juridicoId: string) {
  const supabase = await createClient();
  await supabase.from("juridico").delete().eq("id", juridicoId);
  revalidatePath("/colaborador/juridico");
}
