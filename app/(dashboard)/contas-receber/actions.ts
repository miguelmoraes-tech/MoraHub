"use server";

import { revalidatePath } from "next/cache";
import { getDonoIdAtivo } from "@/lib/empresa-ativa";
import { createClient } from "@/lib/supabase/server";
import { ContaReceberSchema } from "@/lib/validations/conta-receber";
import type { ActionState } from "@/lib/actions/types";

function textOrNull(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const str = value.toString().trim();
  return str === "" ? null : str;
}

function parseForm(formData: FormData) {
  return ContaReceberSchema.safeParse({
    descricao: formData.get("descricao"),
    valor: formData.get("valor"),
    cliente_id: textOrNull(formData.get("cliente_id")) ?? undefined,
    proposta_id: textOrNull(formData.get("proposta_id")) ?? undefined,
    data_vencimento: formData.get("data_vencimento"),
    data_recebimento: textOrNull(formData.get("data_recebimento")) ?? undefined,
    status: formData.get("status") ?? "pendente",
    observacoes: textOrNull(formData.get("observacoes")) ?? undefined,
  });
}

export async function createContaReceber(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const donoId = await getDonoIdAtivo();
  if (!donoId) return { error: "Sessão expirada. Faça login novamente." };

  const supabase = await createClient();
  const { error } = await supabase.from("contas_receber").insert({
    user_id: donoId,
    cliente_id: parsed.data.cliente_id ?? null,
    proposta_id: parsed.data.proposta_id ?? null,
    descricao: parsed.data.descricao,
    valor: parsed.data.valor,
    data_vencimento: parsed.data.data_vencimento,
    data_recebimento: parsed.data.data_recebimento ?? null,
    status: parsed.data.status,
    observacoes: parsed.data.observacoes ?? null,
  });
  if (error) return { error: "Não foi possível salvar a conta." };

  revalidatePath("/contas-receber");
  return { ok: true };
}

export async function updateContaReceber(
  contaId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("contas_receber")
    .update({
      cliente_id: parsed.data.cliente_id ?? null,
      proposta_id: parsed.data.proposta_id ?? null,
      descricao: parsed.data.descricao,
      valor: parsed.data.valor,
      data_vencimento: parsed.data.data_vencimento,
      data_recebimento: parsed.data.data_recebimento ?? null,
      status: parsed.data.status,
      observacoes: parsed.data.observacoes ?? null,
    })
    .eq("id", contaId);
  if (error) return { error: "Não foi possível atualizar a conta." };

  revalidatePath("/contas-receber");
  return { ok: true };
}

export async function deleteContaReceber(contaId: string) {
  const supabase = await createClient();
  await supabase.from("contas_receber").delete().eq("id", contaId);
  revalidatePath("/contas-receber");
}
