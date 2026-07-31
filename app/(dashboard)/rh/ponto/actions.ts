"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveDonoIdForRH } from "@/lib/rh";
import { ControlePontoSchema } from "@/lib/validations/controle-ponto";
import type { ActionState } from "@/lib/actions/types";

function textOrNull(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const str = value.toString().trim();
  return str === "" ? null : str;
}

function parseForm(formData: FormData) {
  return ControlePontoSchema.safeParse({
    funcionario_id: formData.get("funcionario_id"),
    data: formData.get("data"),
    entrada: textOrNull(formData.get("entrada")) ?? undefined,
    saida_almoco: textOrNull(formData.get("saida_almoco")) ?? undefined,
    volta_almoco: textOrNull(formData.get("volta_almoco")) ?? undefined,
    saida: textOrNull(formData.get("saida")) ?? undefined,
    horas_trabalhadas: textOrNull(formData.get("horas_trabalhadas")) ?? undefined,
    status: formData.get("status") ?? "normal",
    observacoes: textOrNull(formData.get("observacoes")) ?? undefined,
  });
}

export async function salvarPonto(
  existingId: string | null,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const payload = {
    funcionario_id: parsed.data.funcionario_id,
    data: parsed.data.data,
    entrada: parsed.data.entrada ?? null,
    saida_almoco: parsed.data.saida_almoco ?? null,
    volta_almoco: parsed.data.volta_almoco ?? null,
    saida: parsed.data.saida ?? null,
    horas_trabalhadas: parsed.data.horas_trabalhadas ?? null,
    status: parsed.data.status,
    observacoes: parsed.data.observacoes ?? null,
  };

  if (existingId) {
    const { error } = await supabase
      .from("controle_ponto")
      .update(payload)
      .eq("id", existingId);
    if (error) return { error: "Não foi possível atualizar o registro." };
  } else {
    const donoId = await getEffectiveDonoIdForRH();
    if (!donoId) return { error: "Sessão expirada. Faça login novamente." };

    const { error } = await supabase.from("controle_ponto").insert({
      user_id: donoId,
      ...payload,
    });
    if (error) return { error: "Não foi possível salvar o registro." };
  }

  revalidatePath("/rh/ponto");
  return { ok: true };
}

export async function deletePonto(pontoId: string) {
  const supabase = await createClient();
  await supabase.from("controle_ponto").delete().eq("id", pontoId);
  revalidatePath("/rh/ponto");
}
