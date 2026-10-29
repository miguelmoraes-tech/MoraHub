"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAcessoJuridicoEdicaoComClientes } from "@/lib/juridico-acesso";
import { PropriedadeIntelectualSchema } from "@/lib/validations/propriedade-intelectual";
import type { ActionState } from "@/lib/actions/types";

const SEM_PERMISSAO = "Você não tem permissão para fazer isso.";

function textOrNull(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const str = value.toString().trim();
  return str === "" ? null : str;
}

function parseForm(formData: FormData) {
  return PropriedadeIntelectualSchema.safeParse({
    cliente_id: formData.get("cliente_id"),
    tipo: formData.get("tipo") ?? "Marca",
    nome: formData.get("nome"),
    numero_registro: textOrNull(formData.get("numero_registro")) ?? undefined,
    orgao: textOrNull(formData.get("orgao")) ?? undefined,
    status: formData.get("status") ?? "pendente",
    data_registro: textOrNull(formData.get("data_registro")) ?? undefined,
    data_renovacao: textOrNull(formData.get("data_renovacao")) ?? undefined,
    observacoes: textOrNull(formData.get("observacoes")) ?? undefined,
  });
}

/** O cliente precisa ser da empresa ativa (nunca confiar no id vindo do formulário). */
async function clienteDaEmpresa(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clienteId: string,
  workspaceId: string
) {
  const { data } = await supabase
    .from("clientes")
    .select("id")
    .eq("id", clienteId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return !!data;
}

export async function createPropriedadeIntelectual(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const acesso = await getAcessoJuridicoEdicaoComClientes();
  if (!acesso) return { error: SEM_PERMISSAO };
  const supabase = await createClient();
  if (!(await clienteDaEmpresa(supabase, parsed.data.cliente_id, acesso.workspaceId))) {
    return { error: "Cliente inválido." };
  }

  const { error } = await supabase.from("propriedade_intelectual").insert({
    user_id: acesso.donoId,
    workspace_id: acesso.workspaceId,
    cliente_id: parsed.data.cliente_id,
    tipo: parsed.data.tipo,
    nome: parsed.data.nome,
    numero_registro: parsed.data.numero_registro ?? null,
    orgao: parsed.data.orgao ?? null,
    status: parsed.data.status,
    data_registro: parsed.data.data_registro ?? null,
    data_renovacao: parsed.data.data_renovacao ?? null,
    observacoes: parsed.data.observacoes ?? null,
  });
  if (error) return { error: "Não foi possível salvar o registro." };

  revalidatePath("/juridico/propriedade-intelectual");
  revalidatePath("/juridico");
  return { ok: true };
}

export async function updatePropriedadeIntelectual(
  itemId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const acesso = await getAcessoJuridicoEdicaoComClientes();
  if (!acesso) return { error: SEM_PERMISSAO };
  const supabase = await createClient();
  if (!(await clienteDaEmpresa(supabase, parsed.data.cliente_id, acesso.workspaceId))) {
    return { error: "Cliente inválido." };
  }

  const { error } = await supabase
    .from("propriedade_intelectual")
    .update({
      cliente_id: parsed.data.cliente_id,
      tipo: parsed.data.tipo,
      nome: parsed.data.nome,
      numero_registro: parsed.data.numero_registro ?? null,
      orgao: parsed.data.orgao ?? null,
      status: parsed.data.status,
      data_registro: parsed.data.data_registro ?? null,
      data_renovacao: parsed.data.data_renovacao ?? null,
      observacoes: parsed.data.observacoes ?? null,
    })
    .eq("id", itemId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: "Não foi possível atualizar o registro." };

  revalidatePath("/juridico/propriedade-intelectual");
  revalidatePath("/juridico");
  return { ok: true };
}

export async function deletePropriedadeIntelectual(itemId: string) {
  const acesso = await getAcessoJuridicoEdicaoComClientes();
  if (!acesso) return;

  const supabase = await createClient();
  await supabase
    .from("propriedade_intelectual")
    .delete()
    .eq("id", itemId)
    .eq("workspace_id", acesso.workspaceId);
  revalidatePath("/juridico/propriedade-intelectual");
  revalidatePath("/juridico");
}
