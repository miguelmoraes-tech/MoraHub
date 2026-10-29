"use server";

import { revalidatePath } from "next/cache";
import { getAcessoEdicao } from "@/lib/empresa-ativa";
import { createClient } from "@/lib/supabase/server";
import { FeriasSchema } from "@/lib/validations/ferias";
import type { ActionState } from "@/lib/actions/types";

const SEM_PERMISSAO = "Você não tem permissão para fazer isso.";

function textOrNull(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const str = value.toString().trim();
  return str === "" ? null : str;
}

function parseForm(formData: FormData) {
  return FeriasSchema.safeParse({
    funcionario_id: formData.get("funcionario_id"),
    periodo_aquisitivo_inicio: textOrNull(formData.get("periodo_aquisitivo_inicio")) ?? undefined,
    periodo_aquisitivo_fim: textOrNull(formData.get("periodo_aquisitivo_fim")) ?? undefined,
    dias_direito: textOrNull(formData.get("dias_direito")) ?? undefined,
    dias_gozados: textOrNull(formData.get("dias_gozados")) ?? undefined,
    data_inicio_gozo: textOrNull(formData.get("data_inicio_gozo")) ?? undefined,
    data_fim_gozo: textOrNull(formData.get("data_fim_gozo")) ?? undefined,
    status: formData.get("status") ?? "pendente",
    observacoes: textOrNull(formData.get("observacoes")) ?? undefined,
  });
}

export async function createFerias(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  // RH por pessoa: exige permissão de edição.
  const acesso = await getAcessoEdicao("rh");
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase.from("ferias").insert({
    user_id: acesso.donoId,
    workspace_id: acesso.workspaceId,
    funcionario_id: parsed.data.funcionario_id,
    periodo_aquisitivo_inicio: parsed.data.periodo_aquisitivo_inicio ?? null,
    periodo_aquisitivo_fim: parsed.data.periodo_aquisitivo_fim ?? null,
    dias_direito: parsed.data.dias_direito ?? 30,
    dias_gozados: parsed.data.dias_gozados ?? 0,
    data_inicio_gozo: parsed.data.data_inicio_gozo ?? null,
    data_fim_gozo: parsed.data.data_fim_gozo ?? null,
    status: parsed.data.status,
    observacoes: parsed.data.observacoes ?? null,
  });
  if (error) return { error: "Não foi possível salvar as férias." };

  revalidatePath("/rh/ferias");
  revalidatePath("/rh");
  return { ok: true };
}

export async function updateFerias(
  feriaId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const acesso = await getAcessoEdicao("rh");
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase
    .from("ferias")
    .update({
      funcionario_id: parsed.data.funcionario_id,
      periodo_aquisitivo_inicio: parsed.data.periodo_aquisitivo_inicio ?? null,
      periodo_aquisitivo_fim: parsed.data.periodo_aquisitivo_fim ?? null,
      dias_direito: parsed.data.dias_direito ?? 30,
      dias_gozados: parsed.data.dias_gozados ?? 0,
      data_inicio_gozo: parsed.data.data_inicio_gozo ?? null,
      data_fim_gozo: parsed.data.data_fim_gozo ?? null,
      status: parsed.data.status,
      observacoes: parsed.data.observacoes ?? null,
    })
    .eq("id", feriaId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: "Não foi possível atualizar as férias." };

  revalidatePath("/rh/ferias");
  revalidatePath("/rh");
  return { ok: true };
}

export async function deleteFerias(feriaId: string) {
  const acesso = await getAcessoEdicao("rh");
  if (!acesso) return;

  const supabase = await createClient();
  await supabase
    .from("ferias")
    .delete()
    .eq("id", feriaId)
    .eq("workspace_id", acesso.workspaceId);
  revalidatePath("/rh/ferias");
  revalidatePath("/rh");
}
