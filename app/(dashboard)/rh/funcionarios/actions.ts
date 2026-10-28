"use server";

import { revalidatePath } from "next/cache";
import { getAcessoSoDono } from "@/lib/empresa-ativa";
import { createClient } from "@/lib/supabase/server";
import { FuncionarioSchema } from "@/lib/validations/funcionario";
import type { ActionState } from "@/lib/actions/types";

const SEM_PERMISSAO = "Você não tem permissão para fazer isso.";

function textOrNull(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const str = value.toString().trim();
  return str === "" ? null : str;
}

function parseForm(formData: FormData) {
  return FuncionarioSchema.safeParse({
    nome: formData.get("nome"),
    cargo: textOrNull(formData.get("cargo")) ?? undefined,
    cpf: textOrNull(formData.get("cpf")) ?? undefined,
    email: textOrNull(formData.get("email")) ?? undefined,
    telefone: textOrNull(formData.get("telefone")) ?? undefined,
    data_admissao: textOrNull(formData.get("data_admissao")) ?? undefined,
    data_desligamento: textOrNull(formData.get("data_desligamento")) ?? undefined,
    tipo_contrato: formData.get("tipo_contrato") ?? "clt",
    salario: textOrNull(formData.get("salario")) ?? undefined,
    status: formData.get("status") ?? "ativo",
    observacoes: textOrNull(formData.get("observacoes")) ?? undefined,
    departamento_id: textOrNull(formData.get("departamento_id")) ?? undefined,
    gestor_id: textOrNull(formData.get("gestor_id")) ?? undefined,
  });
}

export async function createFuncionario(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  // RH é só do fundador/cofundador.
  const acesso = await getAcessoSoDono("rh");
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase.from("funcionarios").insert({
    user_id: acesso.donoId,
    workspace_id: acesso.workspaceId,
    nome: parsed.data.nome,
    cargo: parsed.data.cargo ?? null,
    cpf: parsed.data.cpf ?? null,
    email: parsed.data.email ?? null,
    telefone: parsed.data.telefone ?? null,
    data_admissao: parsed.data.data_admissao ?? null,
    data_desligamento: parsed.data.data_desligamento ?? null,
    tipo_contrato: parsed.data.tipo_contrato,
    salario: parsed.data.salario ?? null,
    status: parsed.data.status,
    observacoes: parsed.data.observacoes ?? null,
    departamento_id: parsed.data.departamento_id ?? null,
    gestor_id: parsed.data.gestor_id ?? null,
  });
  if (error) return { error: "Não foi possível salvar o funcionário." };

  revalidatePath("/rh/funcionarios");
  revalidatePath("/rh");
  return { ok: true };
}

export async function updateFuncionario(
  funcionarioId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  if (parsed.data.gestor_id === funcionarioId) {
    return { error: "Um funcionário não pode ser seu próprio gestor." };
  }

  const acesso = await getAcessoSoDono("rh");
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase
    .from("funcionarios")
    .update({
      nome: parsed.data.nome,
      cargo: parsed.data.cargo ?? null,
      cpf: parsed.data.cpf ?? null,
      email: parsed.data.email ?? null,
      telefone: parsed.data.telefone ?? null,
      data_admissao: parsed.data.data_admissao ?? null,
      data_desligamento: parsed.data.data_desligamento ?? null,
      tipo_contrato: parsed.data.tipo_contrato,
      salario: parsed.data.salario ?? null,
      status: parsed.data.status,
      observacoes: parsed.data.observacoes ?? null,
      departamento_id: parsed.data.departamento_id ?? null,
      gestor_id: parsed.data.gestor_id ?? null,
    })
    .eq("id", funcionarioId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: "Não foi possível atualizar o funcionário." };

  revalidatePath("/rh/funcionarios");
  revalidatePath("/rh");
  return { ok: true };
}

export async function deleteFuncionario(funcionarioId: string) {
  const acesso = await getAcessoSoDono("rh");
  if (!acesso) return;

  const supabase = await createClient();
  await supabase
    .from("funcionarios")
    .delete()
    .eq("id", funcionarioId)
    .eq("workspace_id", acesso.workspaceId);
  revalidatePath("/rh/funcionarios");
  revalidatePath("/rh");
}
