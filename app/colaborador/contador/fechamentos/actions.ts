"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/actions/types";
import type { FechamentoChecklistItem, FechamentoStatus } from "@/lib/types";

function textOrNull(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const str = value.toString().trim();
  return str === "" ? null : str;
}

function parseChecklist(formData: FormData): FechamentoChecklistItem[] | null {
  const raw = formData.get("checklist");
  if (typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.map((entry) => ({
      item: String(entry.item),
      feito: Boolean(entry.feito),
    }));
  } catch {
    return null;
  }
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

export async function createFechamento(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const clienteId = textOrNull(formData.get("cliente_id"));
  const mesReferencia = textOrNull(formData.get("mes_referencia"));
  if (!clienteId || !mesReferencia) {
    return { error: "Dados inválidos." };
  }

  const supabase = await createClient();
  const donoId = await resolveDonoId(supabase, clienteId);
  if (!donoId) return { error: "Cliente inválido." };

  // Checklist column has a default with the standard items, so a bare
  // insert (cliente_id + mês) is enough to create the fechamento.
  const { error } = await supabase.from("fechamentos_mensais").insert({
    user_id: donoId,
    cliente_id: clienteId,
    mes_referencia: mesReferencia,
  });
  if (error) return { error: "Não foi possível criar o fechamento." };

  revalidatePath("/colaborador/contador/fechamentos");
  return { ok: true };
}

export async function updateFechamento(
  fechamentoId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const status = formData.get("status") as FechamentoStatus | null;
  const checklist = parseChecklist(formData);
  if (!status || !checklist) return { error: "Dados inválidos." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("fechamentos_mensais")
    .update({
      status,
      checklist,
      observacoes: textOrNull(formData.get("observacoes")),
      updated_at: new Date().toISOString(),
    })
    .eq("id", fechamentoId);
  if (error) return { error: "Não foi possível atualizar o fechamento." };

  revalidatePath("/colaborador/contador/fechamentos");
  return { ok: true };
}
