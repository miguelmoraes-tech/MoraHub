"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAcessoJuridicoEdicaoComClientes } from "@/lib/juridico-acesso";
import type { ActionState } from "@/lib/actions/types";
import type { ChecklistItem, ComplianceStatus } from "@/lib/types";

const SEM_PERMISSAO = "Você não tem permissão para fazer isso.";
const STATUS_VALIDOS: ComplianceStatus[] = ["pendente", "em_andamento", "conforme"];
const CATEGORIAS_VALIDAS = ["LGPD", "Alvará", "Licença", "Outro"];

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

export async function createCompliance(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const clienteId = textOrNull(formData.get("cliente_id"));
  const categoria = textOrNull(formData.get("categoria"));
  if (!clienteId || !categoria || !CATEGORIAS_VALIDAS.includes(categoria)) {
    return { error: "Dados inválidos." };
  }

  const acesso = await getAcessoJuridicoEdicaoComClientes();
  if (!acesso) return { error: SEM_PERMISSAO };
  const supabase = await createClient();

  // O cliente precisa ser da empresa ativa.
  const { data: cliente } = await supabase
    .from("clientes")
    .select("id")
    .eq("id", clienteId)
    .eq("workspace_id", acesso.workspaceId)
    .maybeSingle();
  if (!cliente) return { error: "Cliente inválido." };

  // A coluna checklist tem default com os itens padrão de LGPD: um insert
  // simples (cliente_id + categoria) basta para criar o registro.
  const { error } = await supabase.from("compliance_juridico").insert({
    user_id: acesso.donoId,
    workspace_id: acesso.workspaceId,
    cliente_id: clienteId,
    categoria,
  });
  if (error) return { error: "Não foi possível criar o registro." };

  revalidatePath("/juridico/compliance");
  revalidatePath("/juridico");
  return { ok: true };
}

export async function updateCompliance(
  itemId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const status = formData.get("status") as ComplianceStatus | null;
  const checklist = parseChecklist(formData);
  if (!status || !STATUS_VALIDOS.includes(status) || !checklist) {
    return { error: "Dados inválidos." };
  }

  const acesso = await getAcessoJuridicoEdicaoComClientes();
  if (!acesso) return { error: SEM_PERMISSAO };

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
    .eq("id", itemId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: "Não foi possível atualizar o registro." };

  revalidatePath("/juridico/compliance");
  revalidatePath("/juridico");
  return { ok: true };
}
