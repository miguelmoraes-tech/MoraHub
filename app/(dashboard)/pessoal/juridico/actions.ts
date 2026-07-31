"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PessoalPropriedadeIntelectualSchema } from "@/lib/validations/pessoal-propriedade-intelectual";
import { PessoalComplianceSchema } from "@/lib/validations/pessoal-compliance";
import type { ActionState } from "@/lib/actions/types";
import type { ChecklistItem } from "@/lib/types";

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

function parsePropriedadeIntelectualForm(formData: FormData) {
  return PessoalPropriedadeIntelectualSchema.safeParse({
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

export async function createPessoalPropriedadeIntelectual(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parsePropriedadeIntelectualForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase.from("pessoal_propriedade_intelectual").insert({
    user_id: user.id,
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

  revalidatePath("/pessoal/juridico");
  return { ok: true };
}

export async function updatePessoalPropriedadeIntelectual(
  itemId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parsePropriedadeIntelectualForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("pessoal_propriedade_intelectual")
    .update({
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

  revalidatePath("/pessoal/juridico");
  return { ok: true };
}

export async function deletePessoalPropriedadeIntelectual(itemId: string) {
  const { supabase } = await requireUser();
  await supabase.from("pessoal_propriedade_intelectual").delete().eq("id", itemId);
  revalidatePath("/pessoal/juridico");
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

export async function createPessoalCompliance(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = PessoalComplianceSchema.pick({ categoria: true }).safeParse({
    categoria: formData.get("categoria"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase.from("pessoal_compliance").insert({
    user_id: user.id,
    categoria: parsed.data.categoria,
  });
  if (error) return { error: "Não foi possível criar o registro." };

  revalidatePath("/pessoal/juridico");
  return { ok: true };
}

export async function updatePessoalCompliance(
  itemId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const checklist = parseChecklist(formData);
  const parsed = PessoalComplianceSchema.pick({
    status: true,
    proxima_revisao: true,
    observacoes: true,
  }).safeParse({
    status: formData.get("status"),
    proxima_revisao: textOrNull(formData.get("proxima_revisao")) ?? undefined,
    observacoes: textOrNull(formData.get("observacoes")) ?? undefined,
  });
  if (!parsed.success || !checklist) {
    return { error: parsed.success ? "Dados inválidos." : parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("pessoal_compliance")
    .update({
      status: parsed.data.status,
      checklist,
      proxima_revisao: parsed.data.proxima_revisao ?? null,
      observacoes: parsed.data.observacoes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId);
  if (error) return { error: "Não foi possível atualizar o registro." };

  revalidatePath("/pessoal/juridico");
  return { ok: true };
}

export async function deletePessoalCompliance(itemId: string) {
  const { supabase } = await requireUser();
  await supabase.from("pessoal_compliance").delete().eq("id", itemId);
  revalidatePath("/pessoal/juridico");
}
