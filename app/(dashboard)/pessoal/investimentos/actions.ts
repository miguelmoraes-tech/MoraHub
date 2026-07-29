"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PessoalInvestimentoSchema } from "@/lib/validations/pessoal-investimento";
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

function parseInvestimentoForm(formData: FormData) {
  return PessoalInvestimentoSchema.safeParse({
    name: formData.get("name"),
    investment_type: formData.get("investment_type"),
    invested_amount: formData.get("invested_amount"),
    current_value: textOrNull(formData.get("current_value")) ?? undefined,
    account_id: textOrNull(formData.get("account_id")) ?? undefined,
    broker: textOrNull(formData.get("broker")) ?? undefined,
    purchase_date: textOrNull(formData.get("purchase_date")) ?? undefined,
    notes: textOrNull(formData.get("notes")) ?? undefined,
  });
}

export async function createPessoalInvestimento(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseInvestimentoForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase.from("pessoal_investments").insert({
    user_id: user.id,
    name: parsed.data.name,
    investment_type: parsed.data.investment_type,
    invested_amount: parsed.data.invested_amount,
    current_value: parsed.data.current_value ?? null,
    account_id: parsed.data.account_id ?? null,
    broker: parsed.data.broker ?? null,
    purchase_date: parsed.data.purchase_date ?? null,
    notes: parsed.data.notes ?? null,
  });
  if (error) return { error: "Não foi possível salvar o investimento." };

  revalidatePath("/pessoal/investimentos");
  revalidatePath("/pessoal");
  return { ok: true };
}

export async function updatePessoalInvestimento(
  investimentoId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseInvestimentoForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("pessoal_investments")
    .update({
      name: parsed.data.name,
      investment_type: parsed.data.investment_type,
      invested_amount: parsed.data.invested_amount,
      current_value: parsed.data.current_value ?? null,
      broker: parsed.data.broker ?? null,
      purchase_date: parsed.data.purchase_date ?? null,
      notes: parsed.data.notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", investimentoId);
  if (error) return { error: "Não foi possível atualizar o investimento." };

  revalidatePath("/pessoal/investimentos");
  revalidatePath("/pessoal");
  return { ok: true };
}

export async function deletePessoalInvestimento(investimentoId: string) {
  const { supabase } = await requireUser();
  await supabase.from("pessoal_investments").delete().eq("id", investimentoId);
  revalidatePath("/pessoal/investimentos");
  revalidatePath("/pessoal");
}
