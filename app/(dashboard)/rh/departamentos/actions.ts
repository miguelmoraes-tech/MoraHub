"use server";

import { revalidatePath } from "next/cache";
import { getAcessoEdicao } from "@/lib/empresa-ativa";
import { createClient } from "@/lib/supabase/server";
import { DepartamentoSchema } from "@/lib/validations/departamento";
import type { ActionState } from "@/lib/actions/types";

const SEM_PERMISSAO = "Você não tem permissão para fazer isso.";

function textOrNull(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const str = value.toString().trim();
  return str === "" ? null : str;
}

function parseForm(formData: FormData) {
  return DepartamentoSchema.safeParse({
    nome: formData.get("nome"),
    descricao: textOrNull(formData.get("descricao")) ?? undefined,
    gestor_funcionario_id: textOrNull(formData.get("gestor_funcionario_id")) ?? undefined,
  });
}

export async function createDepartamento(
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
  const { error } = await supabase.from("departamentos").insert({
    user_id: acesso.donoId,
    workspace_id: acesso.workspaceId,
    nome: parsed.data.nome,
    descricao: parsed.data.descricao ?? null,
    gestor_funcionario_id: parsed.data.gestor_funcionario_id ?? null,
  });
  if (error) return { error: "Não foi possível salvar o departamento." };

  revalidatePath("/rh/departamentos");
  revalidatePath("/rh");
  return { ok: true };
}

export async function updateDepartamento(
  departamentoId: string,
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
    .from("departamentos")
    .update({
      nome: parsed.data.nome,
      descricao: parsed.data.descricao ?? null,
      gestor_funcionario_id: parsed.data.gestor_funcionario_id ?? null,
    })
    .eq("id", departamentoId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: "Não foi possível atualizar o departamento." };

  revalidatePath("/rh/departamentos");
  revalidatePath("/rh");
  return { ok: true };
}

export async function deleteDepartamento(departamentoId: string) {
  const acesso = await getAcessoEdicao("rh");
  if (!acesso) return;

  const supabase = await createClient();
  await supabase
    .from("departamentos")
    .delete()
    .eq("id", departamentoId)
    .eq("workspace_id", acesso.workspaceId);
  revalidatePath("/rh/departamentos");
  revalidatePath("/rh");
}
