"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PropostaSchema } from "@/lib/validations/proposta";
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

function parsePropostaForm(formData: FormData) {
  return PropostaSchema.safeParse({
    titulo: formData.get("titulo"),
    descricao: textOrNull(formData.get("descricao")) ?? undefined,
    valor: textOrNull(formData.get("valor")) ?? undefined,
    versao: formData.get("versao") ?? "1",
    status: formData.get("status") ?? "enviada",
    data_envio: textOrNull(formData.get("data_envio")) ?? undefined,
    data_resposta: textOrNull(formData.get("data_resposta")) ?? undefined,
    observacoes: textOrNull(formData.get("observacoes")) ?? undefined,
  });
}

function revalidateParent(leadId: string | null, clienteId: string | null) {
  if (leadId) revalidatePath("/leads");
  if (clienteId) revalidatePath(`/clientes/${clienteId}`);
}

export async function createProposta(
  leadId: string | null,
  clienteId: string | null,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parsePropostaForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase.from("propostas").insert({
    user_id: user.id,
    lead_id: leadId,
    cliente_id: clienteId,
    titulo: parsed.data.titulo,
    descricao: parsed.data.descricao ?? null,
    valor: parsed.data.valor ?? null,
    versao: parsed.data.versao,
    status: parsed.data.status,
    data_envio: parsed.data.data_envio ?? null,
    data_resposta: parsed.data.data_resposta ?? null,
    observacoes: parsed.data.observacoes ?? null,
  });
  if (error) return { error: "Não foi possível salvar a proposta." };

  revalidateParent(leadId, clienteId);
  return { ok: true };
}

export async function updateProposta(
  propostaId: string,
  leadId: string | null,
  clienteId: string | null,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parsePropostaForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("propostas")
    .update({
      titulo: parsed.data.titulo,
      descricao: parsed.data.descricao ?? null,
      valor: parsed.data.valor ?? null,
      versao: parsed.data.versao,
      status: parsed.data.status,
      data_envio: parsed.data.data_envio ?? null,
      data_resposta: parsed.data.data_resposta ?? null,
      observacoes: parsed.data.observacoes ?? null,
    })
    .eq("id", propostaId);
  if (error) return { error: "Não foi possível atualizar a proposta." };

  revalidateParent(leadId, clienteId);
  return { ok: true };
}

export async function deleteProposta(
  propostaId: string,
  leadId: string | null,
  clienteId: string | null
) {
  const { supabase } = await requireUser();
  await supabase.from("propostas").delete().eq("id", propostaId);
  revalidateParent(leadId, clienteId);
}
