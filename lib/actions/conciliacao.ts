"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { filtrarContasPorPapel, getContasVinculadas } from "@/lib/colaborador";
import { parseOfx } from "@/lib/ofx/parse";
import type { ActionState } from "@/lib/actions/types";

function textOrNull(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const str = value.toString().trim();
  return str === "" ? null : str;
}

function revalidateConciliacao() {
  revalidatePath("/conciliacao");
  revalidatePath("/colaborador/contador/conciliacao");
}

/**
 * Confere que o usuário logado pode agir sobre `donoId`: é o próprio dono,
 * ou um contador vinculado e ativo. Redundante com a RLS da tabela (que já
 * bloqueia no banco), mas permite retornar um erro claro em vez de um
 * update silenciosamente vazio.
 */
async function assertAcesso(donoId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  if (user.id === donoId) return supabase;

  const contas = filtrarContasPorPapel(await getContasVinculadas(), "contador");
  if (contas.some((c) => c.dono_id === donoId)) return supabase;
  return null;
}

export async function importarOfx(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const donoId = textOrNull(formData.get("dono_id"));
  const arquivo = formData.get("arquivo");
  if (!donoId || !(arquivo instanceof File) || arquivo.size === 0) {
    return { error: "Selecione um arquivo OFX." };
  }

  const supabase = await assertAcesso(donoId);
  if (!supabase) return { error: "Conta inválida." };

  let texto: string;
  try {
    texto = await arquivo.text();
  } catch {
    return { error: "Não foi possível ler o arquivo." };
  }

  const transacoes = parseOfx(texto);
  if (transacoes.length === 0) {
    return { error: "Nenhum lançamento encontrado nesse arquivo OFX." };
  }

  const { data: existentes } = await supabase
    .from("lancamentos_extrato")
    .select("data, descricao, valor, tipo")
    .eq("user_id", donoId);
  const chavesExistentes = new Set(
    ((existentes ?? []) as { data: string; descricao: string; valor: number; tipo: string }[]).map(
      (l) => `${l.data}|${l.valor}|${l.tipo}|${l.descricao}`
    )
  );

  const novos = transacoes
    .filter((t) => !chavesExistentes.has(`${t.data}|${t.valor}|${t.tipo}|${t.descricao}`))
    .map((t) => ({
      user_id: donoId,
      data: t.data,
      descricao: t.descricao,
      valor: t.valor,
      tipo: t.tipo,
      status_conciliacao: "pendente" as const,
      arquivo_origem: arquivo.name,
    }));

  if (novos.length === 0) {
    return { error: "Todos os lançamentos desse arquivo já foram importados." };
  }

  const { error } = await supabase.from("lancamentos_extrato").insert(novos);
  if (error) return { error: "Não foi possível importar o extrato." };

  revalidateConciliacao();
  return { ok: true };
}

export async function vincularLancamento(
  lancamentoId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const donoId = textOrNull(formData.get("dono_id"));
  const gastoId = textOrNull(formData.get("gasto_id"));
  const comprovanteId = textOrNull(formData.get("comprovante_id"));
  if (!donoId || (!gastoId && !comprovanteId)) {
    return { error: "Selecione um lançamento para vincular." };
  }

  const supabase = await assertAcesso(donoId);
  if (!supabase) return { error: "Conta inválida." };

  if (gastoId) {
    const { data } = await supabase
      .from("gastos")
      .select("id")
      .eq("id", gastoId)
      .eq("user_id", donoId)
      .maybeSingle();
    if (!data) return { error: "Gasto inválido." };
  }
  if (comprovanteId) {
    const { data } = await supabase
      .from("comprovantes")
      .select("id")
      .eq("id", comprovanteId)
      .eq("user_id", donoId)
      .maybeSingle();
    if (!data) return { error: "Comprovante inválido." };
  }

  const { error } = await supabase
    .from("lancamentos_extrato")
    .update({
      gasto_id: gastoId,
      comprovante_id: comprovanteId,
      status_conciliacao: "conciliado",
    })
    .eq("id", lancamentoId)
    .eq("user_id", donoId);
  if (error) return { error: "Não foi possível conciliar o lançamento." };

  revalidateConciliacao();
  return { ok: true };
}

export async function marcarIgnorado(
  lancamentoId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const donoId = textOrNull(formData.get("dono_id"));
  if (!donoId) return { error: "Conta inválida." };

  const supabase = await assertAcesso(donoId);
  if (!supabase) return { error: "Conta inválida." };

  const { error } = await supabase
    .from("lancamentos_extrato")
    .update({ status_conciliacao: "ignorado" })
    .eq("id", lancamentoId)
    .eq("user_id", donoId);
  if (error) return { error: "Não foi possível ignorar o lançamento." };

  revalidateConciliacao();
  return { ok: true };
}

export async function desfazerConciliacao(
  lancamentoId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const donoId = textOrNull(formData.get("dono_id"));
  if (!donoId) return { error: "Conta inválida." };

  const supabase = await assertAcesso(donoId);
  if (!supabase) return { error: "Conta inválida." };

  const { error } = await supabase
    .from("lancamentos_extrato")
    .update({ status_conciliacao: "pendente", gasto_id: null, comprovante_id: null })
    .eq("id", lancamentoId)
    .eq("user_id", donoId);
  if (error) return { error: "Não foi possível desfazer a conciliação." };

  revalidateConciliacao();
  return { ok: true };
}
