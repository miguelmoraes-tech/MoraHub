"use server";

import { revalidatePath } from "next/cache";
import { getAcessoFinanceiroEdicao } from "@/lib/financeiro/acesso";
import { createClient } from "@/lib/supabase/server";
import { OrcamentoSchema } from "@/lib/validations/orcamento";
import type { ActionState } from "@/lib/actions/types";

const SEM_PERMISSAO = "Você não tem permissão para fazer isso.";

function textOrNull(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const str = value.toString().trim();
  return str === "" ? null : str;
}

/** The <input type="month"> field posts "YYYY-MM" — normalize to a date. */
function parseForm(formData: FormData) {
  const mes = formData.get("mes_referencia");
  const mesReferencia =
    typeof mes === "string" && /^\d{4}-\d{2}$/.test(mes) ? `${mes}-01` : mes;

  return OrcamentoSchema.safeParse({
    categoria: formData.get("categoria"),
    mes_referencia: mesReferencia,
    valor_planejado: formData.get("valor_planejado"),
    observacoes: textOrNull(formData.get("observacoes")) ?? undefined,
  });
}

export async function createOrcamento(
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
  const { error } = await supabase.from("orcamentos").insert({
    user_id: acesso.donoId,
    workspace_id: acesso.workspaceId,
    categoria: parsed.data.categoria,
    mes_referencia: parsed.data.mes_referencia,
    valor_planejado: parsed.data.valor_planejado,
    observacoes: parsed.data.observacoes ?? null,
  });
  if (error) return { error: "Não foi possível salvar o orçamento." };

  revalidatePath("/orcamentos");
  return { ok: true };
}

export async function updateOrcamento(
  orcamentoId: string,
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
    .from("orcamentos")
    .update({
      categoria: parsed.data.categoria,
      mes_referencia: parsed.data.mes_referencia,
      valor_planejado: parsed.data.valor_planejado,
      observacoes: parsed.data.observacoes ?? null,
    })
    .eq("id", orcamentoId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: "Não foi possível atualizar o orçamento." };

  revalidatePath("/orcamentos");
  return { ok: true };
}

export async function deleteOrcamento(orcamentoId: string) {
  const acesso = await getAcessoFinanceiroEdicao();
  if (!acesso) return;

  const supabase = await createClient();
  await supabase
    .from("orcamentos")
    .delete()
    .eq("id", orcamentoId)
    .eq("workspace_id", acesso.workspaceId);
  revalidatePath("/orcamentos");
}
