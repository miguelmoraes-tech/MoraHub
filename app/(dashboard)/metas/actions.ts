"use server";

import { revalidatePath } from "next/cache";
import { getDonoIdAtivo } from "@/lib/empresa-ativa";
import { createClient } from "@/lib/supabase/server";
import { ObjetivoSchema, ResultadoChaveSchema } from "@/lib/validations/meta-okr";
import type { ActionState } from "@/lib/actions/types";
import type { MetaOkrSetor } from "@/lib/types";

function textOrNull(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const str = value.toString().trim();
  return str === "" ? null : str;
}

function parseObjetivoForm(formData: FormData) {
  return ObjetivoSchema.safeParse({
    titulo: formData.get("titulo"),
    descricao: textOrNull(formData.get("descricao")) ?? undefined,
    setor: formData.get("setor") ?? "geral",
    periodo_inicio: textOrNull(formData.get("periodo_inicio")) ?? undefined,
    periodo_fim: textOrNull(formData.get("periodo_fim")) ?? undefined,
    status: formData.get("status") ?? "nao_iniciado",
  });
}

function parseResultadoChaveForm(formData: FormData) {
  return ResultadoChaveSchema.safeParse({
    titulo: formData.get("titulo"),
    valor_meta: formData.get("valor_meta"),
    valor_atual: textOrNull(formData.get("valor_atual")) ?? undefined,
    unidade: formData.get("unidade") ?? "numero",
    responsavel_id: textOrNull(formData.get("responsavel_id")) ?? undefined,
    status: formData.get("status") ?? "nao_iniciado",
  });
}

export async function createObjetivo(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseObjetivoForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const donoId = await getDonoIdAtivo();
  if (!donoId) return { error: "Sessão expirada. Faça login novamente." };

  const supabase = await createClient();
  const { error } = await supabase.from("metas_okr").insert({
    user_id: donoId,
    tipo: "objetivo",
    titulo: parsed.data.titulo,
    descricao: parsed.data.descricao ?? null,
    setor: parsed.data.setor,
    periodo_inicio: parsed.data.periodo_inicio ?? null,
    periodo_fim: parsed.data.periodo_fim ?? null,
    status: parsed.data.status,
  });
  if (error) return { error: "Não foi possível criar o objetivo." };

  revalidatePath("/metas");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateObjetivo(
  objetivoId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseObjetivoForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("metas_okr")
    .update({
      titulo: parsed.data.titulo,
      descricao: parsed.data.descricao ?? null,
      setor: parsed.data.setor,
      periodo_inicio: parsed.data.periodo_inicio ?? null,
      periodo_fim: parsed.data.periodo_fim ?? null,
      status: parsed.data.status,
    })
    .eq("id", objetivoId)
    .eq("tipo", "objetivo");
  if (error) return { error: "Não foi possível atualizar o objetivo." };

  revalidatePath("/metas");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Exclui o objetivo e, em cascata (FK ON DELETE CASCADE), seus Resultados-Chave. */
export async function deleteObjetivo(objetivoId: string) {
  const supabase = await createClient();
  await supabase.from("metas_okr").delete().eq("id", objetivoId).eq("tipo", "objetivo");
  revalidatePath("/metas");
  revalidatePath("/dashboard");
}

export async function createResultadoChave(
  objetivoId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseResultadoChaveForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const donoId = await getDonoIdAtivo();
  if (!donoId) return { error: "Sessão expirada. Faça login novamente." };

  const supabase = await createClient();

  // Setor e período são herdados do Objetivo pai — o Resultado-Chave não
  // tem os seus próprios, ele mede o mesmo objetivo.
  const { data: objetivo } = (await supabase
    .from("metas_okr")
    .select("setor, periodo_inicio, periodo_fim")
    .eq("id", objetivoId)
    .eq("tipo", "objetivo")
    .maybeSingle()) as {
    data: { setor: MetaOkrSetor; periodo_inicio: string | null; periodo_fim: string | null } | null;
  };
  if (!objetivo) return { error: "Objetivo não encontrado." };

  const { error } = await supabase.from("metas_okr").insert({
    user_id: donoId,
    parent_okr_id: objetivoId,
    tipo: "resultado_chave",
    titulo: parsed.data.titulo,
    setor: objetivo.setor,
    periodo_inicio: objetivo.periodo_inicio,
    periodo_fim: objetivo.periodo_fim,
    valor_meta: parsed.data.valor_meta,
    valor_atual: parsed.data.valor_atual ?? 0,
    unidade: parsed.data.unidade,
    responsavel_id: parsed.data.responsavel_id ?? null,
    status: parsed.data.status,
  });
  if (error) return { error: "Não foi possível criar o resultado-chave." };

  revalidatePath("/metas");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateResultadoChave(
  resultadoId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseResultadoChaveForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("metas_okr")
    .update({
      titulo: parsed.data.titulo,
      valor_meta: parsed.data.valor_meta,
      valor_atual: parsed.data.valor_atual ?? 0,
      unidade: parsed.data.unidade,
      responsavel_id: parsed.data.responsavel_id ?? null,
      status: parsed.data.status,
    })
    .eq("id", resultadoId)
    .eq("tipo", "resultado_chave");
  if (error) return { error: "Não foi possível atualizar o resultado-chave." };

  revalidatePath("/metas");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteResultadoChave(resultadoId: string) {
  const supabase = await createClient();
  await supabase.from("metas_okr").delete().eq("id", resultadoId).eq("tipo", "resultado_chave");
  revalidatePath("/metas");
  revalidatePath("/dashboard");
}
