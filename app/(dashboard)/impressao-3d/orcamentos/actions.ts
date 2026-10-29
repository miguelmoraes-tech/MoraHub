"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAcessoEdicao } from "@/lib/empresa-ativa";
import { createClient } from "@/lib/supabase/server";
import { mensagemEscrita, mensagemRpc } from "@/lib/impressao-3d/erros";
import { SEM_PERMISSAO, entradaParaRecalculo } from "@/lib/impressao-3d/regras";
import { OrcamentoSchema, formParaObjeto, primeiroErro } from "@/lib/impressao-3d/validacao";
import type { ActionState } from "@/lib/actions/types";

const MODULO = "p3d_orcamentos";
const ROTA = "/impressao-3d/orcamentos";
const STATUS_ALVO = ["rascunho", "enviado", "aprovado", "recusado", "expirado"];

/**
 * Orçamento: insert/update direto SÓ de titulo, cliente_id, validade,
 * desconto_valor e observacoes. numero, status, subtotal, total, custo_total,
 * lucro_total, enviado_em e aprovado_em são do banco (RPCs): nunca vão no payload.
 */
export async function criarOrcamento(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = OrcamentoSchema.safeParse(formParaObjeto(formData));
  if (!parsed.success) return { error: primeiroErro(parsed.error) };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const { data, error } = await (await createClient())
    .from("p3d_orcamentos")
    .insert({ workspace_id: acesso.workspaceId, ...parsed.data })
    .select("id")
    .single();
  if (error || !data) return { error: mensagemEscrita(error, "Não foi possível criar o orçamento.") };

  revalidatePath(ROTA);
  redirect(`${ROTA}/${data.id}`);
}

export async function atualizarOrcamento(
  orcamentoId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = OrcamentoSchema.safeParse(formParaObjeto(formData));
  if (!parsed.success) return { error: primeiroErro(parsed.error) };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const { data, error } = await (await createClient())
    .from("p3d_orcamentos")
    .update(parsed.data)
    .eq("id", orcamentoId)
    .eq("workspace_id", acesso.workspaceId)
    .eq("status", "rascunho")
    .select("id");
  if (error) return { error: mensagemEscrita(error, "Não foi possível atualizar o orçamento.") };
  if (!data || data.length === 0) return { error: "Só orçamentos em rascunho podem ser editados." };

  revalidatePath(ROTA);
  revalidatePath(`${ROTA}/${orcamentoId}`);
  return { ok: true };
}

/** Só rascunho pode ser excluído. */
export async function excluirOrcamento(orcamentoId: string): Promise<ActionState> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const { data, error } = await (await createClient())
    .from("p3d_orcamentos")
    .delete()
    .eq("id", orcamentoId)
    .eq("workspace_id", acesso.workspaceId)
    .eq("status", "rascunho")
    .select("id");
  if (error) return { error: mensagemEscrita(error, "Não foi possível excluir o orçamento.") };
  if (!data || data.length === 0) return { error: "Só orçamentos em rascunho podem ser excluídos." };

  revalidatePath(ROTA);
  return { ok: true };
}

export interface ItemParaSalvar {
  descricao: string;
  entrada: Record<string, unknown>;
  itemId?: string | null;
  produtoId?: string | null;
  variacaoId?: string | null;
}

function validarItem(item: ItemParaSalvar): { quantidade: number } | { error: string } {
  const descricao = item.descricao.trim();
  if (!descricao) return { error: "Descrição do item: campo obrigatório." };
  const q = item.entrada.quantidade;
  if (typeof q !== "number" || !Number.isInteger(q) || q <= 0) {
    return { error: "Quantidade: informe um número inteiro maior que zero." };
  }
  return { quantidade: q };
}

/**
 * Adiciona ou edita um item (p3d_salvar_item_orcamento): o servidor recalcula
 * e grava o snapshot. Só em rascunho (a RPC recusa nos demais).
 */
export async function salvarItemOrcamento(orcamentoId: string, item: ItemParaSalvar): Promise<ActionState> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };
  const v = validarItem(item);
  if ("error" in v) return v;

  const { error } = await (await createClient()).rpc("p3d_salvar_item_orcamento", {
    p_orcamento_id: orcamentoId,
    p_descricao: item.descricao.trim(),
    p_quantidade: v.quantidade,
    p_entrada: item.entrada as never,
    ...(item.itemId ? { p_item_id: item.itemId } : {}),
    ...(item.produtoId ? { p_produto_id: item.produtoId } : {}),
    ...(item.variacaoId ? { p_variacao_id: item.variacaoId } : {}),
  });
  if (error) return { error: mensagemRpc(error, "Não foi possível salvar o item.") };

  revalidatePath(`${ROTA}/${orcamentoId}`);
  revalidatePath(ROTA);
  return { ok: true };
}

export async function removerItemOrcamento(orcamentoId: string, itemId: string): Promise<ActionState> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const { error } = await (await createClient()).rpc("p3d_remover_item_orcamento", { p_item_id: itemId });
  if (error) return { error: mensagemRpc(error, "Não foi possível remover o item.") };

  revalidatePath(`${ROTA}/${orcamentoId}`);
  revalidatePath(ROTA);
  return { ok: true };
}

/**
 * "Recalcular com valores atuais" (só rascunho): salva de novo cada item mantendo
 * o que é do item (pesos, horas, mão de obra, preço manual) e deixando a RPC
 * resolver preço do material, tarifa, depreciação e margem com os valores de hoje.
 */
export async function recalcularOrcamento(orcamentoId: string): Promise<ActionState> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { data: orcamento } = await supabase
    .from("p3d_orcamentos")
    .select("status")
    .eq("id", orcamentoId)
    .eq("workspace_id", acesso.workspaceId)
    .maybeSingle();
  if (!orcamento) return { error: "Orçamento não encontrado." };
  if (orcamento.status !== "rascunho") return { error: "Só orçamentos em rascunho podem ser recalculados." };

  const { data: itens, error: erroLeitura } = await supabase
    .from("p3d_orcamento_itens")
    .select("id, descricao, quantidade, entrada, produto_id, variacao_id")
    .eq("orcamento_id", orcamentoId)
    .eq("workspace_id", acesso.workspaceId)
    .order("ordem", { ascending: true });
  if (erroLeitura) return { error: mensagemEscrita(erroLeitura, "Não foi possível ler os itens.") };
  if (!itens || itens.length === 0) return { error: "O orçamento não tem itens para recalcular." };

  let feitos = 0;
  for (const item of itens) {
    const { error } = await supabase.rpc("p3d_salvar_item_orcamento", {
      p_orcamento_id: orcamentoId,
      p_item_id: item.id,
      p_descricao: item.descricao,
      p_quantidade: item.quantidade,
      p_entrada: entradaParaRecalculo((item.entrada ?? {}) as Record<string, unknown>) as never,
      ...(item.produto_id ? { p_produto_id: item.produto_id } : {}),
      ...(item.variacao_id ? { p_variacao_id: item.variacao_id } : {}),
    });
    if (error) {
      revalidatePath(`${ROTA}/${orcamentoId}`);
      return {
        error: `Item "${item.descricao}": ${mensagemRpc(error, "não foi possível recalcular.")}${
          feitos > 0 ? ` (${feitos} item(ns) anterior(es) já foram recalculados.)` : ""
        }`,
      };
    }
    feitos++;
  }

  revalidatePath(`${ROTA}/${orcamentoId}`);
  revalidatePath(ROTA);
  return { ok: true };
}

/** Rascunho→enviado (exige item), enviado→aprovado/recusado/expirado/rascunho, recusado/expirado→rascunho. */
export async function mudarStatusOrcamento(orcamentoId: string, status: string): Promise<ActionState> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };
  if (!STATUS_ALVO.includes(status)) return { error: "Status inválido." };

  const { error } = await (await createClient()).rpc("p3d_mudar_status_orcamento", {
    p_orcamento_id: orcamentoId,
    p_status: status,
  });
  if (error) return { error: mensagemRpc(error, "Não foi possível mudar o status.") };

  revalidatePath(`${ROTA}/${orcamentoId}`);
  revalidatePath(ROTA);
  return { ok: true };
}

export type ResultadoUsarEmOrcamento = { orcamentoId: string } | { error: string };

/**
 * "Usar em orçamento", a partir do simulador: usa um rascunho existente ou cria
 * um novo (título obrigatório) e salva o item pela RPC. Devolve o id para a tela
 * levar a pessoa ao orçamento.
 */
export async function usarSimulacaoEmOrcamento(entrada: {
  orcamentoId: string | null;
  novoTitulo: string;
  item: ItemParaSalvar;
}): Promise<ResultadoUsarEmOrcamento> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };
  const v = validarItem(entrada.item);
  if ("error" in v) return v;

  const supabase = await createClient();
  let orcamentoId = entrada.orcamentoId;
  let criado = false;
  if (!orcamentoId) {
    const titulo = entrada.novoTitulo.trim();
    if (!titulo) return { error: "Título do orçamento: campo obrigatório." };
    const { data, error } = await supabase
      .from("p3d_orcamentos")
      .insert({ workspace_id: acesso.workspaceId, titulo })
      .select("id")
      .single();
    if (error || !data) return { error: mensagemEscrita(error, "Não foi possível criar o orçamento.") };
    orcamentoId = data.id as string;
    criado = true;
  }

  const { error } = await supabase.rpc("p3d_salvar_item_orcamento", {
    p_orcamento_id: orcamentoId,
    p_descricao: entrada.item.descricao.trim(),
    p_quantidade: v.quantidade,
    p_entrada: entrada.item.entrada as never,
    ...(entrada.item.produtoId ? { p_produto_id: entrada.item.produtoId } : {}),
    ...(entrada.item.variacaoId ? { p_variacao_id: entrada.item.variacaoId } : {}),
  });
  if (error) {
    revalidatePath(ROTA);
    return {
      error: `${mensagemRpc(error, "Não foi possível salvar o item.")}${
        criado ? " O orçamento foi criado em rascunho, sem o item." : ""
      }`,
    };
  }

  revalidatePath(ROTA);
  revalidatePath(`${ROTA}/${orcamentoId}`);
  return { orcamentoId };
}
