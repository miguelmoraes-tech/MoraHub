"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveDonoId } from "@/lib/financeiro";
import { BeneficioSchema } from "@/lib/validations/beneficio";
import type { ActionState } from "@/lib/actions/types";

function textOrNull(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const str = value.toString().trim();
  return str === "" ? null : str;
}

function parseForm(formData: FormData) {
  return BeneficioSchema.safeParse({
    funcionario_id: formData.get("funcionario_id"),
    tipo: formData.get("tipo"),
    valor: textOrNull(formData.get("valor")) ?? undefined,
    observacoes: textOrNull(formData.get("observacoes")) ?? undefined,
  });
}

export async function createBeneficio(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const donoId = await getEffectiveDonoId();
  if (!donoId) return { error: "Sessão expirada. Faça login novamente." };

  const supabase = await createClient();
  const { error } = await supabase.from("beneficios").insert({
    user_id: donoId,
    funcionario_id: parsed.data.funcionario_id,
    tipo: parsed.data.tipo,
    valor: parsed.data.valor ?? null,
    observacoes: parsed.data.observacoes ?? null,
  });
  if (error) return { error: "Não foi possível salvar o benefício." };

  revalidatePath("/rh/beneficios");
  revalidatePath("/rh");
  return { ok: true };
}

export async function updateBeneficio(
  beneficioId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("beneficios")
    .update({
      funcionario_id: parsed.data.funcionario_id,
      tipo: parsed.data.tipo,
      valor: parsed.data.valor ?? null,
      observacoes: parsed.data.observacoes ?? null,
    })
    .eq("id", beneficioId);
  if (error) return { error: "Não foi possível atualizar o benefício." };

  revalidatePath("/rh/beneficios");
  revalidatePath("/rh");
  return { ok: true };
}

export async function deleteBeneficio(beneficioId: string) {
  const supabase = await createClient();
  await supabase.from("beneficios").delete().eq("id", beneficioId);
  revalidatePath("/rh/beneficios");
  revalidatePath("/rh");
}
