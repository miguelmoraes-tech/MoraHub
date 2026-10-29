"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAcessoFinanceiroEdicao } from "@/lib/financeiro/acesso";
import { GastoSchema } from "@/lib/validations/gasto";
import type { ActionState } from "@/lib/actions/types";

const SEM_PERMISSAO = "Você não tem permissão para fazer isso.";

function textOrNull(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const str = value.toString().trim();
  return str === "" ? null : str;
}

function parseGastoForm(formData: FormData) {
  return GastoSchema.safeParse({
    nome: formData.get("nome"),
    valor: formData.get("valor"),
    tipo: formData.get("tipo") ?? "pontual",
    recorrencia: textOrNull(formData.get("recorrencia")) ?? undefined,
    cliente_id: textOrNull(formData.get("cliente_id")) ?? undefined,
    projeto_id: textOrNull(formData.get("projeto_id")) ?? undefined,
    categoria: textOrNull(formData.get("categoria")) ?? undefined,
    data: formData.get("data"),
  });
}

export async function createGasto(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseGastoForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const acesso = await getAcessoFinanceiroEdicao();
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase.from("gastos").insert({
    user_id: acesso.donoId,
    workspace_id: acesso.workspaceId,
    nome: parsed.data.nome,
    valor: parsed.data.valor,
    tipo: parsed.data.tipo,
    recorrencia: parsed.data.recorrencia ?? null,
    cliente_id: parsed.data.cliente_id ?? null,
    projeto_id: parsed.data.projeto_id ?? null,
    categoria: parsed.data.categoria ?? null,
    data: parsed.data.data,
  });
  if (error) return { error: "Não foi possível salvar o gasto." };

  revalidatePath("/gastos");
  return { ok: true };
}

export async function updateGasto(
  gastoId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseGastoForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const acesso = await getAcessoFinanceiroEdicao();
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase
    .from("gastos")
    .update({
      nome: parsed.data.nome,
      valor: parsed.data.valor,
      tipo: parsed.data.tipo,
      recorrencia: parsed.data.recorrencia ?? null,
      cliente_id: parsed.data.cliente_id ?? null,
      projeto_id: parsed.data.projeto_id ?? null,
      categoria: parsed.data.categoria ?? null,
      data: parsed.data.data,
    })
    .eq("id", gastoId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: "Não foi possível atualizar o gasto." };

  revalidatePath("/gastos");
  return { ok: true };
}

export async function deleteGasto(gastoId: string) {
  const acesso = await getAcessoFinanceiroEdicao();
  if (!acesso) return;

  const supabase = await createClient();
  await supabase
    .from("gastos")
    .delete()
    .eq("id", gastoId)
    .eq("workspace_id", acesso.workspaceId);
  revalidatePath("/gastos");
}
