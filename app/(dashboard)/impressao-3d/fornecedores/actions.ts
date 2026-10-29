"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAcessoEdicao } from "@/lib/empresa-ativa";
import { createClient } from "@/lib/supabase/server";
import { mensagemEscrita, mensagemRpc } from "@/lib/impressao-3d/erros";
import { SEM_PERMISSAO } from "@/lib/impressao-3d/regras";
import { lerRecebimento } from "@/lib/impressao-3d/regras-operacao";
import { formParaObjeto, primeiroErro } from "@/lib/impressao-3d/validacao";
import {
  CompraItemSchema, CompraSchema, FornecedorSchema, RecebimentoSchema,
} from "@/lib/impressao-3d/validacao-operacao";
import { formatMoeda } from "@/lib/impressao-3d/numeros";
import type { ActionState } from "@/lib/actions/types";

const MODULO = "p3d_fornecedores";
const ROTA = "/impressao-3d/fornecedores";

// --- Fornecedores (CRUD direto) -----------------------------------------------------

export async function criarFornecedor(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = FornecedorSchema.safeParse(formParaObjeto(formData));
  if (!parsed.success) return { error: primeiroErro(parsed.error) };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const { error } = await (await createClient())
    .from("p3d_fornecedores")
    .insert({ workspace_id: acesso.workspaceId, ...parsed.data });
  if (error) return { error: mensagemEscrita(error, "Não foi possível salvar o fornecedor.") };

  revalidatePath(ROTA);
  return { ok: true };
}

export async function atualizarFornecedor(
  fornecedorId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = FornecedorSchema.safeParse(formParaObjeto(formData));
  if (!parsed.success) return { error: primeiroErro(parsed.error) };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const { error } = await (await createClient())
    .from("p3d_fornecedores")
    .update(parsed.data)
    .eq("id", fornecedorId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: mensagemEscrita(error, "Não foi possível atualizar o fornecedor.") };

  revalidatePath(ROTA);
  return { ok: true };
}

export async function alternarFornecedorAtivo(fornecedorId: string, ativo: boolean): Promise<ActionState> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const { error } = await (await createClient())
    .from("p3d_fornecedores")
    .update({ ativo })
    .eq("id", fornecedorId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: mensagemEscrita(error, "Não foi possível alterar o fornecedor.") };

  revalidatePath(ROTA);
  return { ok: true };
}

/** Fornecedor com compras ou materiais vinculados não pode ser excluído: o banco recusa, arquive. */
export async function excluirFornecedor(fornecedorId: string): Promise<ActionState> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const { error } = await (await createClient())
    .from("p3d_fornecedores")
    .delete()
    .eq("id", fornecedorId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) {
    return {
      error: mensagemEscrita(error, "Não foi possível excluir o fornecedor. Se ele tem compras ou materiais, arquive."),
    };
  }

  revalidatePath(ROTA);
  return { ok: true };
}

// --- Compras ---------------------------------------------------------------------------

/**
 * Cabeçalho da compra: insert/update direto SÓ de fornecedor_id, data, validade_cotacao,
 * prazo_entrega, frete, desconto e observacoes. status, numero, subtotal, total,
 * recebida_em e conta_pagar_id são do banco (RPCs): nunca vão no payload.
 */
function payloadCompra(d: { data: string | null } & Record<string, unknown>) {
  const { data, ...resto } = d;
  // Sem data, o padrão do banco (hoje) vale.
  return { ...resto, ...(data ? { data } : {}) } as {
    fornecedor_id: string;
    validade_cotacao: string | null;
    prazo_entrega: string | null;
    frete: number;
    desconto: number;
    observacoes: string | null;
    data?: string;
  };
}

export async function criarCompra(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = CompraSchema.safeParse(formParaObjeto(formData));
  if (!parsed.success) return { error: primeiroErro(parsed.error) };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const { data, error } = await (await createClient())
    .from("p3d_compras")
    .insert({ workspace_id: acesso.workspaceId, ...payloadCompra(parsed.data) })
    .select("id")
    .single();
  if (error || !data) return { error: mensagemEscrita(error, "Não foi possível criar a compra.") };

  revalidatePath(ROTA);
  redirect(`${ROTA}/compras/${data.id}`);
}

export async function atualizarCompra(compraId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = CompraSchema.safeParse(formParaObjeto(formData));
  if (!parsed.success) return { error: primeiroErro(parsed.error) };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const { data, error } = await (await createClient())
    .from("p3d_compras")
    .update(payloadCompra(parsed.data))
    .eq("id", compraId)
    .eq("workspace_id", acesso.workspaceId)
    .in("status", ["cotacao", "aprovada"])
    .select("id");
  if (error) return { error: mensagemEscrita(error, "Não foi possível atualizar a compra.") };
  if (!data || data.length === 0) return { error: "Compra recebida ou cancelada não pode ser alterada." };

  revalidatePath(ROTA);
  revalidatePath(`${ROTA}/compras/${compraId}`);
  return { ok: true };
}

/** Só em cotação. */
export async function excluirCompra(compraId: string): Promise<ActionState> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const { data, error } = await (await createClient())
    .from("p3d_compras")
    .delete()
    .eq("id", compraId)
    .eq("workspace_id", acesso.workspaceId)
    .eq("status", "cotacao")
    .select("id");
  if (error) return { error: mensagemEscrita(error, "Não foi possível excluir a compra.") };
  if (!data || data.length === 0) return { error: "Só compras em cotação podem ser excluídas." };

  revalidatePath(ROTA);
  return { ok: true };
}

/**
 * Item da compra (insert/update direto, só em cotação ou aprovada). A quantidade é
 * SEMPRE na unidade base do material (g, ml ou un); preco_unitario é gerado pelo banco,
 * que também recalcula subtotal e total da compra.
 */
export async function salvarItemCompra(
  compraId: string,
  itemId: string | null,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = CompraItemSchema.safeParse(formParaObjeto(formData));
  if (!parsed.success) return { error: primeiroErro(parsed.error) };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  if (itemId) {
    const { error } = await supabase
      .from("p3d_compra_itens")
      .update(parsed.data)
      .eq("id", itemId)
      .eq("compra_id", compraId)
      .eq("workspace_id", acesso.workspaceId);
    if (error) return { error: mensagemEscrita(error, "Não foi possível atualizar o item.") };
  } else {
    const { error } = await supabase
      .from("p3d_compra_itens")
      .insert({ workspace_id: acesso.workspaceId, compra_id: compraId, ...parsed.data });
    if (error) return { error: mensagemEscrita(error, "Não foi possível adicionar o item.") };
  }

  revalidatePath(`${ROTA}/compras/${compraId}`);
  revalidatePath(ROTA);
  return { ok: true };
}

export async function removerItemCompra(compraId: string, itemId: string): Promise<ActionState> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const { error } = await (await createClient())
    .from("p3d_compra_itens")
    .delete()
    .eq("id", itemId)
    .eq("compra_id", compraId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: mensagemEscrita(error, "Não foi possível remover o item.") };

  revalidatePath(`${ROTA}/compras/${compraId}`);
  revalidatePath(ROTA);
  return { ok: true };
}

/** cotacao→aprovada|cancelada; aprovada→cotacao|cancelada (aprovar exige ≥ 1 item: a RPC confere). */
export async function mudarStatusCompra(compraId: string, status: string): Promise<ActionState> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };
  if (!["cotacao", "aprovada", "cancelada"].includes(status)) return { error: "Status inválido." };

  const { error } = await (await createClient()).rpc("p3d_mudar_status_compra", {
    p_compra_id: compraId,
    p_status: status,
  });
  if (error) return { error: mensagemRpc(error, "Não foi possível mudar o status da compra.") };

  revalidatePath(`${ROTA}/compras/${compraId}`);
  revalidatePath(ROTA);
  return { ok: true };
}

export type ResultadoReceber = { error: string } | { ok: true; mensagem: string };

/**
 * Recebe a compra aprovada (p3d_receber_compra): dá entrada no estoque, com frete e
 * desconto rateados por valor, e opcionalmente cria a conta a pagar. Exige edição em
 * Fornecedores E em Estoque; a conta a pagar exige Financeiro ligado, edição nele e
 * vencimento. O banco confere tudo de novo; o texto dos erros vem da RPC.
 */
export async function receberCompra(compraId: string, formData: FormData): Promise<ResultadoReceber> {
  const parsed = RecebimentoSchema.safeParse(formParaObjeto(formData));
  if (!parsed.success) return { error: primeiroErro(parsed.error) };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };
  if (!(await getAcessoEdicao("p3d_estoque"))) {
    return { error: "Receber a compra dá entrada no estoque: é preciso permissão de edição em Estoque." };
  }
  const { gerar_conta_pagar, vencimento } = parsed.data;
  if (gerar_conta_pagar && !(await getAcessoEdicao("financeiro"))) {
    return { error: "Gerar conta a pagar exige o módulo Financeiro ligado e permissão de edição nele." };
  }

  const { data, error } = await (await createClient()).rpc("p3d_receber_compra", {
    p_compra_id: compraId,
    p_gerar_conta_pagar: gerar_conta_pagar,
    ...(gerar_conta_pagar && vencimento ? { p_vencimento: vencimento } : {}),
  });
  if (error) return { error: mensagemRpc(error, "Não foi possível receber a compra.") };

  const r = lerRecebimento(data);
  revalidatePath(`${ROTA}/compras/${compraId}`);
  revalidatePath(ROTA);
  revalidatePath("/impressao-3d/estoque");
  return {
    ok: true,
    mensagem: `${r.itens_recebidos} item(ns) recebido(s) no estoque, total ${formatMoeda(r.total)}.${
      r.conta_pagar_id ? " Conta a pagar criada no Financeiro." : ""
    }`,
  };
}
