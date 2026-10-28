"use server";

import { revalidatePath } from "next/cache";
import { getAcessoFinanceiroEdicao } from "@/lib/financeiro/acesso";
import { createClient } from "@/lib/supabase/server";
import { AssinanteSchema } from "@/lib/validations/assinante";
import type { ActionState } from "@/lib/actions/types";

const SEM_PERMISSAO = "Você não tem permissão para fazer isso.";

function textOrNull(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const str = value.toString().trim();
  return str === "" ? null : str;
}

function parseAssinanteForm(formData: FormData) {
  return AssinanteSchema.safeParse({
    cliente_id: formData.get("cliente_id"),
    plano: formData.get("plano"),
    valor: textOrNull(formData.get("valor")) ?? undefined,
    recorrencia: formData.get("recorrencia") ?? "Mensal",
    data_inicio: textOrNull(formData.get("data_inicio")) ?? undefined,
    proxima_cobranca: textOrNull(formData.get("proxima_cobranca")) ?? undefined,
    status: formData.get("status") ?? "ativa",
  });
}

export async function createAssinante(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseAssinanteForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const acesso = await getAcessoFinanceiroEdicao();
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase.from("assinaturas").insert({
    user_id: acesso.donoId,
    workspace_id: acesso.workspaceId,
    cliente_id: parsed.data.cliente_id,
    plano: parsed.data.plano,
    valor: parsed.data.valor ?? null,
    recorrencia: parsed.data.recorrencia,
    data_inicio: parsed.data.data_inicio ?? null,
    proxima_cobranca: parsed.data.proxima_cobranca ?? null,
    status: parsed.data.status,
  });
  if (error) return { error: "Não foi possível salvar a assinatura." };

  revalidatePath("/assinantes");
  return { ok: true };
}

export async function updateAssinante(
  assinaturaId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseAssinanteForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const acesso = await getAcessoFinanceiroEdicao();
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase
    .from("assinaturas")
    .update({
      cliente_id: parsed.data.cliente_id,
      plano: parsed.data.plano,
      valor: parsed.data.valor ?? null,
      recorrencia: parsed.data.recorrencia,
      data_inicio: parsed.data.data_inicio ?? null,
      proxima_cobranca: parsed.data.proxima_cobranca ?? null,
      status: parsed.data.status,
    })
    .eq("id", assinaturaId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: "Não foi possível atualizar a assinatura." };

  revalidatePath("/assinantes");
  return { ok: true };
}

export async function deleteAssinante(assinaturaId: string) {
  const acesso = await getAcessoFinanceiroEdicao();
  if (!acesso) return;

  const supabase = await createClient();
  await supabase
    .from("assinaturas")
    .delete()
    .eq("id", assinaturaId)
    .eq("workspace_id", acesso.workspaceId);
  revalidatePath("/assinantes");
}
