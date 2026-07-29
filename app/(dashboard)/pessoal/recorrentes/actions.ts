"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PessoalRecorrenteSchema } from "@/lib/validations/pessoal-recorrente";
import { todayISO } from "@/lib/vencimentos/dates";
import type { ActionState } from "@/lib/actions/types";
import type { PessoalRecurringExpensePayment } from "@/lib/pessoal/types";

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

function parseRecorrenteForm(formData: FormData) {
  return PessoalRecorrenteSchema.safeParse({
    name: formData.get("name"),
    amount: formData.get("amount"),
    due_day: formData.get("due_day"),
    category_id: textOrNull(formData.get("category_id")) ?? undefined,
    account_id: textOrNull(formData.get("account_id")) ?? undefined,
    is_active: formData.get("is_active") === "on",
    notes: textOrNull(formData.get("notes")) ?? undefined,
  });
}

export async function createPessoalRecorrente(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseRecorrenteForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase.from("pessoal_recurring_expenses").insert({
    user_id: user.id,
    name: parsed.data.name,
    amount: parsed.data.amount,
    due_day: parsed.data.due_day,
    category_id: parsed.data.category_id ?? null,
    account_id: parsed.data.account_id ?? null,
    is_active: parsed.data.is_active ?? true,
    notes: parsed.data.notes ?? null,
  });
  if (error) return { error: "Não foi possível salvar o gasto recorrente." };

  revalidatePath("/pessoal/recorrentes");
  revalidatePath("/pessoal");
  return { ok: true };
}

export async function updatePessoalRecorrente(
  recorrenteId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseRecorrenteForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("pessoal_recurring_expenses")
    .update({
      name: parsed.data.name,
      amount: parsed.data.amount,
      due_day: parsed.data.due_day,
      category_id: parsed.data.category_id ?? null,
      account_id: parsed.data.account_id ?? null,
      is_active: parsed.data.is_active ?? true,
      notes: parsed.data.notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", recorrenteId);
  if (error) return { error: "Não foi possível atualizar o gasto recorrente." };

  revalidatePath("/pessoal/recorrentes");
  revalidatePath("/pessoal");
  return { ok: true };
}

export async function deletePessoalRecorrente(recorrenteId: string) {
  const { supabase } = await requireUser();
  await supabase.from("pessoal_recurring_expenses").delete().eq("id", recorrenteId);
  revalidatePath("/pessoal/recorrentes");
  revalidatePath("/pessoal");
}

/**
 * Insere uma transação de despesa datada de hoje e marca a linha de
 * pagamento do mês como paga, vinculando o id da transação. Sem rollback
 * entre os dois passos, igual ao comportamento original.
 */
export async function markPessoalRecorrentePaga(paymentId: string) {
  const { supabase, user } = await requireUser();
  if (!user) return;

  const { data: payment } = await supabase
    .from("pessoal_recurring_expense_payments")
    .select("*")
    .eq("id", paymentId)
    .single();

  const paymentRow = payment as PessoalRecurringExpensePayment | null;
  if (!paymentRow || paymentRow.status === "paga") return;

  const { data: expense } = await supabase
    .from("pessoal_recurring_expenses")
    .select("*")
    .eq("id", paymentRow.recurring_expense_id)
    .single();

  if (!expense) return;

  const { data: transaction } = await supabase
    .from("pessoal_transactions")
    .insert({
      user_id: user.id,
      type: "despesa",
      amount: expense.amount,
      category_id: expense.category_id,
      account_id: expense.account_id,
      description: expense.name,
      transaction_date: todayISO(),
    })
    .select("id")
    .single();

  await supabase
    .from("pessoal_recurring_expense_payments")
    .update({
      status: "paga",
      paid_at: todayISO(),
      transaction_id: transaction?.id ?? null,
    })
    .eq("id", paymentId);

  revalidatePath("/pessoal/recorrentes");
  revalidatePath("/pessoal/transacoes");
  revalidatePath("/pessoal/contas");
  revalidatePath("/pessoal");
}
