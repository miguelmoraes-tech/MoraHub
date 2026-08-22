"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveDonoId, getEffectiveWorkspaceId } from "@/lib/financeiro";
import { syncFolhaFromContaPagar } from "@/lib/rh/folha-sync";
import { ContaPagarSchema } from "@/lib/validations/conta-pagar";
import type { ActionState } from "@/lib/actions/types";

function textOrNull(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const str = value.toString().trim();
  return str === "" ? null : str;
}

function parseForm(formData: FormData) {
  return ContaPagarSchema.safeParse({
    descricao: formData.get("descricao"),
    valor: formData.get("valor"),
    fornecedor: textOrNull(formData.get("fornecedor")) ?? undefined,
    categoria: textOrNull(formData.get("categoria")) ?? undefined,
    data_vencimento: formData.get("data_vencimento"),
    data_pagamento: textOrNull(formData.get("data_pagamento")) ?? undefined,
    status: formData.get("status") ?? "pendente",
    observacoes: textOrNull(formData.get("observacoes")) ?? undefined,
  });
}

export async function createContaPagar(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const donoId = await getEffectiveDonoId();
  if (!donoId) return { error: "Sessão expirada. Faça login novamente." };
  const workspaceId = await getEffectiveWorkspaceId();

  const supabase = await createClient();
  const { error } = await supabase.from("contas_pagar").insert({
    user_id: donoId,
    workspace_id: workspaceId,
    descricao: parsed.data.descricao,
    valor: parsed.data.valor,
    fornecedor: parsed.data.fornecedor ?? null,
    categoria: parsed.data.categoria ?? null,
    data_vencimento: parsed.data.data_vencimento,
    data_pagamento: parsed.data.data_pagamento ?? null,
    status: parsed.data.status,
    observacoes: parsed.data.observacoes ?? null,
  });
  if (error) return { error: "Não foi possível salvar a conta." };

  revalidatePath("/contas-pagar");
  return { ok: true };
}

export async function updateContaPagar(
  contaId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("contas_pagar")
    .update({
      descricao: parsed.data.descricao,
      valor: parsed.data.valor,
      fornecedor: parsed.data.fornecedor ?? null,
      categoria: parsed.data.categoria ?? null,
      data_vencimento: parsed.data.data_vencimento,
      data_pagamento: parsed.data.data_pagamento ?? null,
      status: parsed.data.status,
      observacoes: parsed.data.observacoes ?? null,
    })
    .eq("id", contaId);
  if (error) return { error: "Não foi possível atualizar a conta." };

  // Folha de pagamento gerada a partir desta conta (se houver) reflete o mesmo status.
  await syncFolhaFromContaPagar(
    supabase,
    contaId,
    parsed.data.status,
    parsed.data.data_pagamento ?? null
  );

  revalidatePath("/contas-pagar");
  revalidatePath("/rh/folha");
  revalidatePath("/rh");
  return { ok: true };
}

export async function deleteContaPagar(contaId: string) {
  const supabase = await createClient();
  await supabase.from("contas_pagar").delete().eq("id", contaId);
  revalidatePath("/contas-pagar");
}
