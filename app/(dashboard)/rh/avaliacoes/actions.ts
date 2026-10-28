"use server";

import { revalidatePath } from "next/cache";
import { getAcessoSoDono } from "@/lib/empresa-ativa";
import { createClient } from "@/lib/supabase/server";
import { AvaliacaoDesempenhoSchema } from "@/lib/validations/avaliacao-desempenho";
import type { ActionState } from "@/lib/actions/types";

const SEM_PERMISSAO = "Você não tem permissão para fazer isso.";

function textOrNull(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const str = value.toString().trim();
  return str === "" ? null : str;
}

function parseForm(formData: FormData) {
  return AvaliacaoDesempenhoSchema.safeParse({
    funcionario_id: formData.get("funcionario_id"),
    avaliador_id: textOrNull(formData.get("avaliador_id")) ?? undefined,
    periodo_referencia: formData.get("periodo_referencia"),
    nota: textOrNull(formData.get("nota")) ?? undefined,
    pontos_fortes: textOrNull(formData.get("pontos_fortes")) ?? undefined,
    pontos_melhoria: textOrNull(formData.get("pontos_melhoria")) ?? undefined,
    metas_proximo_periodo: textOrNull(formData.get("metas_proximo_periodo")) ?? undefined,
    observacoes: textOrNull(formData.get("observacoes")) ?? undefined,
  });
}

export async function createAvaliacao(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  // RH é só do fundador/cofundador.
  const acesso = await getAcessoSoDono("rh");
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase.from("avaliacoes_desempenho").insert({
    user_id: acesso.donoId,
    workspace_id: acesso.workspaceId,
    funcionario_id: parsed.data.funcionario_id,
    avaliador_id: parsed.data.avaliador_id ?? null,
    periodo_referencia: parsed.data.periodo_referencia,
    nota: parsed.data.nota ?? null,
    pontos_fortes: parsed.data.pontos_fortes ?? null,
    pontos_melhoria: parsed.data.pontos_melhoria ?? null,
    metas_proximo_periodo: parsed.data.metas_proximo_periodo ?? null,
    observacoes: parsed.data.observacoes ?? null,
  });
  if (error) return { error: "Não foi possível salvar a avaliação." };

  revalidatePath("/rh/avaliacoes");
  revalidatePath("/rh");
  return { ok: true };
}

export async function updateAvaliacao(
  avaliacaoId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const acesso = await getAcessoSoDono("rh");
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase
    .from("avaliacoes_desempenho")
    .update({
      funcionario_id: parsed.data.funcionario_id,
      avaliador_id: parsed.data.avaliador_id ?? null,
      periodo_referencia: parsed.data.periodo_referencia,
      nota: parsed.data.nota ?? null,
      pontos_fortes: parsed.data.pontos_fortes ?? null,
      pontos_melhoria: parsed.data.pontos_melhoria ?? null,
      metas_proximo_periodo: parsed.data.metas_proximo_periodo ?? null,
      observacoes: parsed.data.observacoes ?? null,
    })
    .eq("id", avaliacaoId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: "Não foi possível atualizar a avaliação." };

  revalidatePath("/rh/avaliacoes");
  revalidatePath("/rh");
  return { ok: true };
}

export async function deleteAvaliacao(avaliacaoId: string) {
  const acesso = await getAcessoSoDono("rh");
  if (!acesso) return;

  const supabase = await createClient();
  await supabase
    .from("avaliacoes_desempenho")
    .delete()
    .eq("id", avaliacaoId)
    .eq("workspace_id", acesso.workspaceId);
  revalidatePath("/rh/avaliacoes");
  revalidatePath("/rh");
}
