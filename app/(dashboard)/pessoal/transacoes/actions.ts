"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PessoalTransacaoSchema } from "@/lib/validations/pessoal-transacao";
import type { ActionState } from "@/lib/actions/types";

function textOrNull(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const str = value.toString().trim();
  return str === "" ? null : str;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function parseTransacaoForm(formData: FormData) {
  return PessoalTransacaoSchema.safeParse({
    type: formData.get("type"),
    amount: formData.get("amount"),
    description: textOrNull(formData.get("description")) ?? undefined,
    account_id: textOrNull(formData.get("account_id")) ?? undefined,
    category_id: textOrNull(formData.get("category_id")) ?? undefined,
    transaction_date: formData.get("transaction_date"),
    is_recurring: formData.get("is_recurring") === "on",
  });
}

export async function createPessoalTransacao(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseTransacaoForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase.from("pessoal_transactions").insert({
    user_id: user.id,
    type: parsed.data.type,
    amount: parsed.data.amount,
    description: parsed.data.description ?? null,
    account_id: parsed.data.account_id ?? null,
    category_id: parsed.data.category_id ?? null,
    transaction_date: parsed.data.transaction_date,
    is_recurring: parsed.data.is_recurring ?? false,
  });
  if (error) return { error: "Não foi possível salvar a transação." };

  revalidatePath("/pessoal/transacoes");
  revalidatePath("/pessoal/contas");
  revalidatePath("/pessoal");
  return { ok: true };
}

export async function updatePessoalTransacao(
  transacaoId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseTransacaoForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("pessoal_transactions")
    .update({
      type: parsed.data.type,
      amount: parsed.data.amount,
      description: parsed.data.description ?? null,
      account_id: parsed.data.account_id ?? null,
      category_id: parsed.data.category_id ?? null,
      transaction_date: parsed.data.transaction_date,
      is_recurring: parsed.data.is_recurring ?? false,
    })
    .eq("id", transacaoId);
  if (error) return { error: "Não foi possível atualizar a transação." };

  revalidatePath("/pessoal/transacoes");
  revalidatePath("/pessoal/contas");
  revalidatePath("/pessoal");
  return { ok: true };
}

export async function deletePessoalTransacao(transacaoId: string) {
  const { supabase } = await requireUser();
  await supabase.from("pessoal_transactions").delete().eq("id", transacaoId);
  revalidatePath("/pessoal/transacoes");
  revalidatePath("/pessoal/contas");
  revalidatePath("/pessoal");
}
