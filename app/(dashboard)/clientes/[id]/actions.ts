"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ContratoSchema } from "@/lib/validations/contrato";
import { ComprovanteSchema } from "@/lib/validations/comprovante";
import { ServicoSchema } from "@/lib/validations/servico";
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

// ---------- Contratos ----------

export async function createContrato(
  clienteId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = ContratoSchema.safeParse({
    descricao: formData.get("descricao"),
    valor: formData.get("valor"),
    data: textOrNull(formData.get("data")) ?? undefined,
    vencimento: textOrNull(formData.get("vencimento")) ?? undefined,
    link: textOrNull(formData.get("link")) ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase.from("contratos").insert({
    cliente_id: clienteId,
    user_id: user.id,
    descricao: parsed.data.descricao,
    valor: parsed.data.valor,
    data: parsed.data.data ?? null,
    vencimento: parsed.data.vencimento ?? null,
    link: parsed.data.link ?? null,
  });
  if (error) return { error: "Não foi possível salvar o contrato." };

  revalidatePath(`/clientes/${clienteId}`);
  return { ok: true };
}

export async function updateContrato(
  clienteId: string,
  contratoId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = ContratoSchema.safeParse({
    descricao: formData.get("descricao"),
    valor: formData.get("valor"),
    data: textOrNull(formData.get("data")) ?? undefined,
    vencimento: textOrNull(formData.get("vencimento")) ?? undefined,
    link: textOrNull(formData.get("link")) ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("contratos")
    .update({
      descricao: parsed.data.descricao,
      valor: parsed.data.valor,
      data: parsed.data.data ?? null,
      vencimento: parsed.data.vencimento ?? null,
      link: parsed.data.link ?? null,
    })
    .eq("id", contratoId);
  if (error) return { error: "Não foi possível atualizar o contrato." };

  revalidatePath(`/clientes/${clienteId}`);
  return { ok: true };
}

export async function deleteContrato(clienteId: string, contratoId: string) {
  const { supabase } = await requireUser();
  await supabase.from("contratos").delete().eq("id", contratoId);
  revalidatePath(`/clientes/${clienteId}`);
}

// ---------- Comprovantes ----------

export async function createComprovante(
  clienteId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = ComprovanteSchema.safeParse({
    descricao: formData.get("descricao"),
    valor: formData.get("valor"),
    data: textOrNull(formData.get("data")) ?? undefined,
    link: textOrNull(formData.get("link")) ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase.from("comprovantes").insert({
    cliente_id: clienteId,
    user_id: user.id,
    descricao: parsed.data.descricao,
    valor: parsed.data.valor,
    data: parsed.data.data ?? null,
    link: parsed.data.link ?? null,
  });
  if (error) return { error: "Não foi possível salvar o comprovante." };

  revalidatePath(`/clientes/${clienteId}`);
  return { ok: true };
}

export async function updateComprovante(
  clienteId: string,
  comprovanteId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = ComprovanteSchema.safeParse({
    descricao: formData.get("descricao"),
    valor: formData.get("valor"),
    data: textOrNull(formData.get("data")) ?? undefined,
    link: textOrNull(formData.get("link")) ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("comprovantes")
    .update({
      descricao: parsed.data.descricao,
      valor: parsed.data.valor,
      data: parsed.data.data ?? null,
      link: parsed.data.link ?? null,
    })
    .eq("id", comprovanteId);
  if (error) return { error: "Não foi possível atualizar o comprovante." };

  revalidatePath(`/clientes/${clienteId}`);
  return { ok: true };
}

export async function deleteComprovante(
  clienteId: string,
  comprovanteId: string
) {
  const { supabase } = await requireUser();
  await supabase.from("comprovantes").delete().eq("id", comprovanteId);
  revalidatePath(`/clientes/${clienteId}`);
}

// ---------- Serviços ----------

export async function createServico(
  clienteId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = ServicoSchema.safeParse({
    nome: formData.get("nome"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase.from("servicos").insert({
    cliente_id: clienteId,
    user_id: user.id,
    nome: parsed.data.nome,
  });
  if (error) return { error: "Não foi possível salvar o serviço." };

  revalidatePath(`/clientes/${clienteId}`);
  return { ok: true };
}

export async function updateServico(
  clienteId: string,
  servicoId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = ServicoSchema.safeParse({
    nome: formData.get("nome"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("servicos")
    .update({ nome: parsed.data.nome })
    .eq("id", servicoId);
  if (error) return { error: "Não foi possível atualizar o serviço." };

  revalidatePath(`/clientes/${clienteId}`);
  return { ok: true };
}

export async function deleteServico(clienteId: string, servicoId: string) {
  const { supabase } = await requireUser();
  await supabase.from("servicos").delete().eq("id", servicoId);
  revalidatePath(`/clientes/${clienteId}`);
}
