"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { GastoFixoSchema } from "@/lib/validations/gasto-fixo";
import { GastoClienteSchema } from "@/lib/validations/gasto-cliente";
import type { ActionState } from "@/lib/actions/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// ---------- Gastos fixos ----------

export async function createGastoFixo(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = GastoFixoSchema.safeParse({
    nome: formData.get("nome"),
    valor: formData.get("valor"),
    recorrencia: formData.get("recorrencia") ?? "Mensal",
    data: formData.get("data"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase.from("gastos_fixos").insert({
    user_id: user.id,
    nome: parsed.data.nome,
    valor: parsed.data.valor,
    recorrencia: parsed.data.recorrencia,
    data: parsed.data.data,
  });
  if (error) return { error: "Não foi possível salvar o gasto." };

  revalidatePath("/gastos");
  return { ok: true };
}

export async function updateGastoFixo(
  gastoId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = GastoFixoSchema.safeParse({
    nome: formData.get("nome"),
    valor: formData.get("valor"),
    recorrencia: formData.get("recorrencia") ?? "Mensal",
    data: formData.get("data"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("gastos_fixos")
    .update({
      nome: parsed.data.nome,
      valor: parsed.data.valor,
      recorrencia: parsed.data.recorrencia,
      data: parsed.data.data,
    })
    .eq("id", gastoId);
  if (error) return { error: "Não foi possível atualizar o gasto." };

  revalidatePath("/gastos");
  return { ok: true };
}

export async function deleteGastoFixo(gastoId: string) {
  const { supabase } = await requireUser();
  await supabase.from("gastos_fixos").delete().eq("id", gastoId);
  revalidatePath("/gastos");
}

// ---------- Gastos por cliente ----------

export async function createGastoCliente(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = GastoClienteSchema.safeParse({
    cliente_id: formData.get("cliente_id"),
    descricao: formData.get("descricao"),
    valor: formData.get("valor"),
    data: formData.get("data"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase.from("gastos_clientes").insert({
    user_id: user.id,
    cliente_id: parsed.data.cliente_id,
    descricao: parsed.data.descricao,
    valor: parsed.data.valor,
    data: parsed.data.data,
  });
  if (error) return { error: "Não foi possível salvar o gasto." };

  revalidatePath("/gastos");
  return { ok: true };
}

export async function updateGastoCliente(
  gastoId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = GastoClienteSchema.safeParse({
    cliente_id: formData.get("cliente_id"),
    descricao: formData.get("descricao"),
    valor: formData.get("valor"),
    data: formData.get("data"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("gastos_clientes")
    .update({
      cliente_id: parsed.data.cliente_id,
      descricao: parsed.data.descricao,
      valor: parsed.data.valor,
      data: parsed.data.data,
    })
    .eq("id", gastoId);
  if (error) return { error: "Não foi possível atualizar o gasto." };

  revalidatePath("/gastos");
  return { ok: true };
}

export async function deleteGastoCliente(gastoId: string) {
  const { supabase } = await requireUser();
  await supabase.from("gastos_clientes").delete().eq("id", gastoId);
  revalidatePath("/gastos");
}
