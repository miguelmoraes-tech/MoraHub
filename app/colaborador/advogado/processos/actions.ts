"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ProcessoSchema } from "@/lib/validations/processo";
import type { ActionState } from "@/lib/actions/types";

function textOrNull(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const str = value.toString().trim();
  return str === "" ? null : str;
}

function parseForm(formData: FormData) {
  return ProcessoSchema.safeParse({
    cliente_id: formData.get("cliente_id"),
    numero_processo: textOrNull(formData.get("numero_processo")) ?? undefined,
    tribunal_orgao: textOrNull(formData.get("tribunal_orgao")) ?? undefined,
    parte_contraria: textOrNull(formData.get("parte_contraria")) ?? undefined,
    tipo_acao: textOrNull(formData.get("tipo_acao")) ?? undefined,
    fase: formData.get("fase") ?? "inicial",
    proximo_prazo: textOrNull(formData.get("proximo_prazo")) ?? undefined,
    descricao_prazo: textOrNull(formData.get("descricao_prazo")) ?? undefined,
    observacoes: textOrNull(formData.get("observacoes")) ?? undefined,
  });
}

/**
 * `processos.user_id` must be the client's account owner (dono), not the
 * advogado submitting the form — resolved server-side from `cliente_id`
 * rather than trusted from the client, and naturally rejected by RLS if the
 * caller isn't an active advogado on that cliente's owner.
 */
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

export async function createProcesso(
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

  const { error } = await supabase.from("processos").insert({
    user_id: donoId,
    cliente_id: parsed.data.cliente_id,
    numero_processo: parsed.data.numero_processo ?? null,
    tribunal_orgao: parsed.data.tribunal_orgao ?? null,
    parte_contraria: parsed.data.parte_contraria ?? null,
    tipo_acao: parsed.data.tipo_acao ?? null,
    fase: parsed.data.fase,
    proximo_prazo: parsed.data.proximo_prazo ?? null,
    descricao_prazo: parsed.data.descricao_prazo ?? null,
    observacoes: parsed.data.observacoes ?? null,
  });
  if (error) return { error: "Não foi possível salvar o processo." };

  revalidatePath("/colaborador/advogado/processos");
  return { ok: true };
}

export async function updateProcesso(
  processoId: string,
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
    .from("processos")
    .update({
      user_id: donoId,
      cliente_id: parsed.data.cliente_id,
      numero_processo: parsed.data.numero_processo ?? null,
      tribunal_orgao: parsed.data.tribunal_orgao ?? null,
      parte_contraria: parsed.data.parte_contraria ?? null,
      tipo_acao: parsed.data.tipo_acao ?? null,
      fase: parsed.data.fase,
      proximo_prazo: parsed.data.proximo_prazo ?? null,
      descricao_prazo: parsed.data.descricao_prazo ?? null,
      observacoes: parsed.data.observacoes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", processoId);
  if (error) return { error: "Não foi possível atualizar o processo." };

  revalidatePath("/colaborador/advogado/processos");
  return { ok: true };
}

export async function deleteProcesso(processoId: string) {
  const supabase = await createClient();
  await supabase.from("processos").delete().eq("id", processoId);
  revalidatePath("/colaborador/advogado/processos");
}
