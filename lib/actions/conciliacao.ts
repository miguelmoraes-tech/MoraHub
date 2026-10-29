"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAcessoFinanceiroEdicao } from "@/lib/financeiro/acesso";
import { parseOfx } from "@/lib/ofx/parse";
import type { ActionState } from "@/lib/actions/types";

const SEM_PERMISSAO = "Você não tem permissão para fazer isso.";

function textOrNull(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const str = value.toString().trim();
  return str === "" ? null : str;
}

function revalidateConciliacao() {
  revalidatePath("/conciliacao");
}

/**
 * A empresa é SEMPRE a ativa, validada no servidor (getAcessoFinanceiroEdicao):
 * nada de conta vinda do formulário. A RLS segue como barreira real; isto evita
 * tentar e devolve uma mensagem clara.
 */

export async function importarOfx(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { error: "Selecione um arquivo OFX." };
  }

  const acesso = await getAcessoFinanceiroEdicao();
  if (!acesso) return { error: SEM_PERMISSAO };
  const supabase = await createClient();

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
    .eq("workspace_id", acesso.workspaceId);
  const chavesExistentes = new Set(
    ((existentes ?? []) as { data: string; descricao: string; valor: number; tipo: string }[]).map(
      (l) => `${l.data}|${l.valor}|${l.tipo}|${l.descricao}`
    )
  );

  const novos = transacoes
    .filter((t) => !chavesExistentes.has(`${t.data}|${t.valor}|${t.tipo}|${t.descricao}`))
    .map((t) => ({
      user_id: acesso.donoId,
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

  const { error } = await supabase
    .from("lancamentos_extrato")
    .insert(novos.map((n) => ({ ...n, workspace_id: acesso.workspaceId })));
  if (error) return { error: "Não foi possível importar o extrato." };

  revalidateConciliacao();
  return { ok: true };
}

export async function vincularLancamento(
  lancamentoId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const gastoId = textOrNull(formData.get("gasto_id"));
  const comprovanteId = textOrNull(formData.get("comprovante_id"));
  if (!gastoId && !comprovanteId) {
    return { error: "Selecione um lançamento para vincular." };
  }

  const acesso = await getAcessoFinanceiroEdicao();
  if (!acesso) return { error: SEM_PERMISSAO };
  const supabase = await createClient();

  if (gastoId) {
    const { data } = await supabase
      .from("gastos")
      .select("id")
      .eq("id", gastoId)
      .eq("workspace_id", acesso.workspaceId)
      .maybeSingle();
    if (!data) return { error: "Gasto inválido." };
  }
  if (comprovanteId) {
    const { data } = await supabase
      .from("comprovantes")
      .select("id")
      .eq("id", comprovanteId)
      .eq("workspace_id", acesso.workspaceId)
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
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: "Não foi possível conciliar o lançamento." };

  revalidateConciliacao();
  return { ok: true };
}

export async function marcarIgnorado(
  lancamentoId: string,
  _prevState: ActionState,
  _formData: FormData
): Promise<ActionState> {
  const acesso = await getAcessoFinanceiroEdicao();
  if (!acesso) return { error: SEM_PERMISSAO };
  const supabase = await createClient();

  const { error } = await supabase
    .from("lancamentos_extrato")
    .update({ status_conciliacao: "ignorado" })
    .eq("id", lancamentoId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: "Não foi possível ignorar o lançamento." };

  revalidateConciliacao();
  return { ok: true };
}

export async function desfazerConciliacao(
  lancamentoId: string,
  _prevState: ActionState,
  _formData: FormData
): Promise<ActionState> {
  const acesso = await getAcessoFinanceiroEdicao();
  if (!acesso) return { error: SEM_PERMISSAO };
  const supabase = await createClient();

  const { error } = await supabase
    .from("lancamentos_extrato")
    .update({ status_conciliacao: "pendente", gasto_id: null, comprovante_id: null })
    .eq("id", lancamentoId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: "Não foi possível desfazer a conciliação." };

  revalidateConciliacao();
  return { ok: true };
}
