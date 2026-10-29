"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAcessoJuridicoEdicaoComClientes } from "@/lib/juridico-acesso";
import { ProcessoSchema } from "@/lib/validations/processo";
import type { ActionState } from "@/lib/actions/types";

const SEM_PERMISSAO = "Você não tem permissão para fazer isso.";

function textOrNull(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const str = value.toString().trim();
  return str === "" ? null : str;
}

function parseForm(formData: FormData) {
  return ProcessoSchema.safeParse({
    cliente_id: formData.get("cliente_id"),
    numero_processo: textOrNull(formData.get("numero_processo")) ?? undefined,
    tribunal_orgao: textOrNull(formData.get("tribunal_orgao")) ?? undefined,
    parte_contraria: textOrNull(formData.get("parte_contraria")) ?? undefined,
    tipo_acao: textOrNull(formData.get("tipo_acao")) ?? undefined,
    fase: formData.get("fase") ?? "inicial",
    proximo_prazo: textOrNull(formData.get("proximo_prazo")) ?? undefined,
    descricao_prazo: textOrNull(formData.get("descricao_prazo")) ?? undefined,
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

export async function createProcesso(
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

  const { error } = await supabase.from("processos").insert({
    user_id: acesso.donoId,
    workspace_id: acesso.workspaceId,
    cliente_id: parsed.data.cliente_id,
    numero_processo: parsed.data.numero_processo ?? null,
    tribunal_orgao: parsed.data.tribunal_orgao ?? null,
    parte_contraria: parsed.data.parte_contraria ?? null,
    tipo_acao: parsed.data.tipo_acao ?? null,
    fase: parsed.data.fase,
    proximo_prazo: parsed.data.proximo_prazo ?? null,
    descricao_prazo: parsed.data.descricao_prazo ?? null,
    observacoes: parsed.data.observacoes ?? null,
  });
  if (error) return { error: "Não foi possível salvar o processo." };

  revalidatePath("/juridico/processos");
  revalidatePath("/juridico");
  return { ok: true };
}

export async function updateProcesso(
  processoId: string,
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
    .from("processos")
    .update({
      cliente_id: parsed.data.cliente_id,
      numero_processo: parsed.data.numero_processo ?? null,
      tribunal_orgao: parsed.data.tribunal_orgao ?? null,
      parte_contraria: parsed.data.parte_contraria ?? null,
      tipo_acao: parsed.data.tipo_acao ?? null,
      fase: parsed.data.fase,
      proximo_prazo: parsed.data.proximo_prazo ?? null,
      descricao_prazo: parsed.data.descricao_prazo ?? null,
      observacoes: parsed.data.observacoes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", processoId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: "Não foi possível atualizar o processo." };

  revalidatePath("/juridico/processos");
  revalidatePath("/juridico");
  return { ok: true };
}

export async function deleteProcesso(processoId: string) {
  const acesso = await getAcessoJuridicoEdicaoComClientes();
  if (!acesso) return;

  const supabase = await createClient();
  await supabase
    .from("processos")
    .delete()
    .eq("id", processoId)
    .eq("workspace_id", acesso.workspaceId);
  revalidatePath("/juridico/processos");
  revalidatePath("/juridico");
}
