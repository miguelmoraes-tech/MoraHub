"use server";

import { revalidatePath } from "next/cache";
import { getAcessoFinanceiroEdicao } from "@/lib/financeiro/acesso";
import { createClient } from "@/lib/supabase/server";
import { syncFolhaFromContaPagar } from "@/lib/rh/folha-sync";
import { ContaPagarSchema } from "@/lib/validations/conta-pagar";
import type { ActionState } from "@/lib/actions/types";

const SEM_PERMISSAO = "Você não tem permissão para fazer isso.";

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

  const acesso = await getAcessoFinanceiroEdicao();
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase.from("contas_pagar").insert({
    user_id: acesso.donoId,
    workspace_id: acesso.workspaceId,
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

  const acesso = await getAcessoFinanceiroEdicao();
  if (!acesso) return { error: SEM_PERMISSAO };

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
    .eq("id", contaId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: "Não foi possível atualizar a conta." };

  // Folha de pagamento gerada a partir desta conta (se houver) reflete o mesmo status.
  await syncFolhaFromContaPagar(
    supabase,
    acesso.workspaceId,
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
  const acesso = await getAcessoFinanceiroEdicao();
  if (!acesso) return;

  const supabase = await createClient();
  await supabase
    .from("contas_pagar")
    .delete()
    .eq("id", contaId)
    .eq("workspace_id", acesso.workspaceId);
  revalidatePath("/contas-pagar");
}
