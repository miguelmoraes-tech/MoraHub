"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/actions/types";
import type { ChecklistItem, ComplianceStatus } from "@/lib/types";

function textOrNull(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const str = value.toString().trim();
  return str === "" ? null : str;
}

function parseChecklist(formData: FormData): ChecklistItem[] | null {
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

/** Same pattern as processos/fechamentos actions.ts — derives the owner from cliente_id server-side. */
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

export async function createCompliance(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const clienteId = textOrNull(formData.get("cliente_id"));
  const categoria = textOrNull(formData.get("categoria"));
  if (!clienteId || !categoria) return { error: "Dados inválidos." };

  const supabase = await createClient();
  const donoId = await resolveDonoId(supabase, clienteId);
  if (!donoId) return { error: "Cliente inválido." };

  // Checklist column has a default with the standard LGPD items, so a bare
  // insert (cliente_id + categoria) is enough to create the registro.
  const { error } = await supabase.from("compliance_juridico").insert({
    user_id: donoId,
    cliente_id: clienteId,
    categoria,
  });
  if (error) return { error: "Não foi possível criar o registro." };

  revalidatePath("/colaborador/advogado/compliance");
  return { ok: true };
}

export async function updateCompliance(
  itemId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const status = formData.get("status") as ComplianceStatus | null;
  const checklist = parseChecklist(formData);
  if (!status || !checklist) return { error: "Dados inválidos." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("compliance_juridico")
    .update({
      status,
      checklist,
      proxima_revisao: textOrNull(formData.get("proxima_revisao")),
      observacoes: textOrNull(formData.get("observacoes")),
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId);
  if (error) return { error: "Não foi possível atualizar o registro." };

  revalidatePath("/colaborador/advogado/compliance");
  return { ok: true };
}
