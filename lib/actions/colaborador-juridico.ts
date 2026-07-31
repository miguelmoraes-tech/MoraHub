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

function parseForm(formData: FormData, tipoFixo: JuridicoTipo | null) {
  return JuridicoSchema.safeParse({
    titulo: formData.get("titulo"),
    tipo: tipoFixo ?? formData.get("tipo"),
    prazo: textOrNull(formData.get("prazo")) ?? undefined,
    status: formData.get("status") ?? "pendente",
    nota: textOrNull(formData.get("nota")) ?? undefined,
  });
}

function revalidateWorkspaces() {
  revalidatePath("/colaborador/advogado");
  revalidatePath("/colaborador/contador");
}

/**
 * Shared by both the advogado (tipoFixo="Jurídico") and contador
 * (tipoFixo=null, tipo comes from the form's Contábil/Fiscal select)
 * workspaces. `donoId` (which linked account this belongs to) travels in
 * the form itself, not as a bound arg — it's picked from a <select> at
 * submit time, so it can't be known when the action is bound at render.
 */
export async function createJuridicoColaborador(
  tipoFixo: JuridicoTipo | null,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const donoId = textOrNull(formData.get("donoId"));
  if (!donoId) return { error: "Selecione o cliente." };

  const parsed = parseForm(formData, tipoFixo);
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

  revalidateWorkspaces();
  return { ok: true };
}

export async function updateJuridicoColaborador(
  juridicoId: string,
  tipoFixo: JuridicoTipo | null,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData, tipoFixo);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
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

  revalidateWorkspaces();
  return { ok: true };
}

export async function deleteJuridicoColaborador(juridicoId: string) {
  const supabase = await createClient();
  await supabase.from("juridico").delete().eq("id", juridicoId);
  revalidateWorkspaces();
}
