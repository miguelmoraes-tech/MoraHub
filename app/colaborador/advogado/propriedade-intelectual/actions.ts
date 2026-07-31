"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PropriedadeIntelectualSchema } from "@/lib/validations/propriedade-intelectual";
import type { ActionState } from "@/lib/actions/types";

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

/** Same pattern as processos/actions.ts — derives the owner from cliente_id server-side. */
async function resolveDonoId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clienteId: string
) {
  const { data } = await supabase
    .from("clientes")
    .select("user_id")
    .eq("id", clienteId)
    .maybeSingle();
  return (data as { user_id: string } | null)?.user_id ?? null;
}

export async function createPropriedadeIntelectual(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const donoId = await resolveDonoId(supabase, parsed.data.cliente_id);
  if (!donoId) return { error: "Cliente inválido." };

  const { error } = await supabase.from("propriedade_intelectual").insert({
    user_id: donoId,
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

  revalidatePath("/colaborador/advogado/propriedade-intelectual");
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

  const supabase = await createClient();
  const donoId = await resolveDonoId(supabase, parsed.data.cliente_id);
  if (!donoId) return { error: "Cliente inválido." };

  const { error } = await supabase
    .from("propriedade_intelectual")
    .update({
      user_id: donoId,
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
    .eq("id", itemId);
  if (error) return { error: "Não foi possível atualizar o registro." };

  revalidatePath("/colaborador/advogado/propriedade-intelectual");
  return { ok: true };
}

export async function deletePropriedadeIntelectual(itemId: string) {
  const supabase = await createClient();
  await supabase.from("propriedade_intelectual").delete().eq("id", itemId);
  revalidatePath("/colaborador/advogado/propriedade-intelectual");
}
