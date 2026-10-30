"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAcessoEdicao } from "@/lib/empresa-ativa";
import { createClient } from "@/lib/supabase/server";
import { mensagemEscrita, mensagemRpc } from "@/lib/impressao-3d/erros";
import { SEM_PERMISSAO, SEM_PERMISSAO_CUSTOS, podeVerCustos } from "@/lib/impressao-3d/regras";
import { lerPagamento, pedidoEditavel } from "@/lib/impressao-3d/regras-operacao";
import { lerBaixaPecas, lerDevolucaoPecas, textoBaixa } from "@/lib/impressao-3d/pecas";
import { formParaObjeto, primeiroErro } from "@/lib/impressao-3d/validacao";
import {
  PagamentoSchema, PedidoItemSchema, PedidoLimitadoSchema, PedidoSchema,
} from "@/lib/impressao-3d/validacao-operacao";
import { formatMoeda } from "@/lib/impressao-3d/numeros";
import type { ActionState } from "@/lib/actions/types";

const MODULO = "p3d_pedidos";
const ROTA = "/impressao-3d/pedidos";
const STATUS_ALVO = ["confirmado", "em_producao", "pronto", "enviado", "entregue", "cancelado"];

/**
 * Pedido: insert/update direto SÓ de cliente_id | cliente_avulso, prioridade, data_pedido,
 * prazo_entrega, desconto_valor, frete_valor e observacoes (cliente, desconto e frete só
 * antes da produção). numero, status, status_pagamento, origem, orcamento_id, subtotal,
 * total, custo_total, lucro_total, pago_valor e cancelado_* são do banco (RPCs): nunca
 * vão no payload.
 */
function payloadPedido(d: {
  cliente_id: string | null;
  cliente_avulso: string | null;
  prioridade: string;
  data_pedido: string | null;
  prazo_entrega: string | null;
  desconto_valor: number;
  frete_valor: number;
  observacoes: string | null;
}) {
  const { data_pedido, cliente_id, cliente_avulso, ...resto } = d;
  return {
    ...resto,
    // Um dos dois: o cliente cadastrado vence o nome avulso.
    cliente_id,
    cliente_avulso: cliente_id ? null : cliente_avulso,
    ...(data_pedido ? { data_pedido } : {}),
  };
}

export async function criarPedido(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = PedidoSchema.safeParse(formParaObjeto(formData));
  if (!parsed.success) return { error: primeiroErro(parsed.error) };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const { data, error } = await (await createClient())
    .from("p3d_pedidos")
    .insert({ workspace_id: acesso.workspaceId, ...payloadPedido(parsed.data) })
    .select("id")
    .single();
  if (error || !data) return { error: mensagemEscrita(error, "Não foi possível criar o pedido.") };

  revalidatePath(ROTA);
  redirect(`${ROTA}/${data.id}`);
}

/**
 * Antes da produção (novo/confirmado) edita tudo; depois só prioridade, prazo e
 * observações (o formulário já oferece só esses campos).
 */
export async function atualizarPedido(pedidoId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { data: atual } = await supabase
    .from("p3d_pedidos")
    .select("status")
    .eq("id", pedidoId)
    .eq("workspace_id", acesso.workspaceId)
    .maybeSingle();
  if (!atual) return { error: "Pedido não encontrado." };

  const objeto = formParaObjeto(formData);
  let payload: Record<string, unknown>;
  if (pedidoEditavel(atual.status as never)) {
    const parsed = PedidoSchema.safeParse(objeto);
    if (!parsed.success) return { error: primeiroErro(parsed.error) };
    payload = payloadPedido(parsed.data);
  } else {
    const parsed = PedidoLimitadoSchema.safeParse(objeto);
    if (!parsed.success) return { error: primeiroErro(parsed.error) };
    payload = parsed.data;
  }

  const { data, error } = await supabase
    .from("p3d_pedidos")
    .update(payload)
    .eq("id", pedidoId)
    .eq("workspace_id", acesso.workspaceId)
    .select("id");
  if (error) return { error: mensagemEscrita(error, "Não foi possível atualizar o pedido.") };
  if (!data || data.length === 0) return { error: "Pedido não encontrado." };

  revalidatePath(ROTA);
  revalidatePath(`${ROTA}/${pedidoId}`);
  return { ok: true };
}

/** Só pedido novo, sem pagamento e que não veio de orçamento. */
export async function excluirPedido(pedidoId: string): Promise<ActionState> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const { data, error } = await (await createClient())
    .from("p3d_pedidos")
    .delete()
    .eq("id", pedidoId)
    .eq("workspace_id", acesso.workspaceId)
    .eq("status", "novo")
    .eq("pago_valor", 0)
    .is("orcamento_id", null)
    .select("id");
  if (error) return { error: mensagemEscrita(error, "Não foi possível excluir o pedido.") };
  if (!data || data.length === 0) {
    return { error: "Só pedidos novos, sem pagamento e que não vieram de orçamento podem ser excluídos. Cancele o pedido." };
  }

  revalidatePath(ROTA);
  return { ok: true };
}

/**
 * Item manual (insert/update direto, só em pedido novo/confirmado). Itens vindos de
 * orçamento são somente leitura. preco_total, custo_total e lucro são calculados pelo
 * banco; custo_unitario é custo e só vai com o extra "custos".
 */
export async function salvarItemPedido(
  pedidoId: string,
  itemId: string | null,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = PedidoItemSchema.safeParse(formParaObjeto(formData));
  if (!parsed.success) return { error: primeiroErro(parsed.error) };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };
  const verCustos = podeVerCustos(acesso);
  const { custo_unitario, ...resto } = parsed.data;
  if (custo_unitario !== null && !verCustos) return { error: SEM_PERMISSAO_CUSTOS };
  const payload = { ...resto, ...(verCustos ? { custo_unitario: custo_unitario ?? 0 } : {}) };

  const supabase = await createClient();
  if (itemId) {
    const { data, error } = await supabase
      .from("p3d_pedido_itens")
      .update(payload)
      .eq("id", itemId)
      .eq("pedido_id", pedidoId)
      .eq("workspace_id", acesso.workspaceId)
      .neq("origem", "orcamento")
      .select("id");
    if (error) return { error: mensagemEscrita(error, "Não foi possível atualizar o item.") };
    if (!data || data.length === 0) return { error: "Itens vindos de orçamento não podem ser editados." };
  } else {
    const { error } = await supabase
      .from("p3d_pedido_itens")
      .insert({ workspace_id: acesso.workspaceId, pedido_id: pedidoId, ...payload });
    if (error) return { error: mensagemEscrita(error, "Não foi possível adicionar o item.") };
  }

  revalidatePath(`${ROTA}/${pedidoId}`);
  revalidatePath(ROTA);
  return { ok: true };
}

export async function removerItemPedido(pedidoId: string, itemId: string): Promise<ActionState> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const { data, error } = await (await createClient())
    .from("p3d_pedido_itens")
    .delete()
    .eq("id", itemId)
    .eq("pedido_id", pedidoId)
    .eq("workspace_id", acesso.workspaceId)
    .neq("origem", "orcamento")
    .select("id");
  if (error) return { error: mensagemEscrita(error, "Não foi possível remover o item.") };
  if (!data || data.length === 0) return { error: "Itens vindos de orçamento não podem ser removidos." };

  revalidatePath(`${ROTA}/${pedidoId}`);
  revalidatePath(ROTA);
  return { ok: true };
}

/**
 * Muda o status pela RPC (confirma item, fila de produção, qualidade e envios no banco).
 * Cancelar exige motivo; a RPC cancela os trabalhos da fila e recusa com trabalho imprimindo.
 */
export async function mudarStatusPedido(pedidoId: string, status: string, motivo?: string): Promise<ActionState> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };
  if (!STATUS_ALVO.includes(status)) return { error: "Status inválido." };
  const texto = motivo?.trim() ?? "";
  if (status === "cancelado" && !texto) return { error: "Informe o motivo do cancelamento." };

  const { error } = await (await createClient()).rpc("p3d_mudar_status_pedido", {
    p_pedido_id: pedidoId,
    p_status: status,
    ...(texto ? { p_motivo: texto } : {}),
  });
  if (error) return { error: mensagemRpc(error, "Não foi possível mudar o status do pedido.") };

  revalidatePath(`${ROTA}/${pedidoId}`);
  revalidatePath(ROTA);
  revalidatePath("/impressao-3d/producao");
  return { ok: true };
}

export type ResultadoPagamentoAction = { error: string } | { ok: true; mensagem: string };

/**
 * Pagamento ou estorno (p3d_registrar_pagamento). O banco recusa pagamento acima do saldo e
 * estorno acima do pago. Estorno NÃO vai ao Financeiro (a mensagem avisa); lançar no Financeiro
 * exige o módulo ligado e edição nele.
 */
export async function registrarPagamento(pedidoId: string, formData: FormData): Promise<ResultadoPagamentoAction> {
  const parsed = PagamentoSchema.safeParse(formParaObjeto(formData));
  if (!parsed.success) return { error: primeiroErro(parsed.error) };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };
  const { tipo, valor, forma, data, observacao, lancar_financeiro } = parsed.data;
  const lancar = lancar_financeiro && tipo === "pagamento";
  if (lancar && !(await getAcessoEdicao("financeiro"))) {
    return { error: "Lançar no Financeiro exige o módulo Financeiro ligado e permissão de edição nele." };
  }

  const { data: retorno, error } = await (await createClient()).rpc("p3d_registrar_pagamento", {
    p_pedido_id: pedidoId,
    p_valor: valor,
    p_forma: forma,
    p_tipo: tipo,
    ...(data ? { p_data: data } : {}),
    ...(observacao ? { p_observacao: observacao } : {}),
    ...(lancar ? { p_lancar_financeiro: true } : {}),
  });
  if (error) return { error: mensagemRpc(error, "Não foi possível registrar o pagamento.") };

  const r = lerPagamento(retorno);
  revalidatePath(`${ROTA}/${pedidoId}`);
  revalidatePath(ROTA);
  const base = tipo === "estorno" ? "Estorno registrado" : "Pagamento registrado";
  return {
    ok: true,
    mensagem:
      `${base}. Pago: ${formatMoeda(r.pago_valor)} · saldo: ${formatMoeda(r.saldo)}.` +
      (r.conta_receber_id ? " Lançado como conta a receber no Financeiro." : "") +
      (tipo === "estorno" ? " O estorno não é enviado ao Financeiro: ajuste lá manualmente, se houver lançamento." : ""),
  };
}

export type ResultadoGerarProducao = { error: string } | { ok: true; criados: number };

/** Cria um trabalho por item do pedido (idempotente por item). Exige edição em Produção. */
export async function gerarProducaoDoPedido(pedidoId: string): Promise<ResultadoGerarProducao> {
  const acesso = await getAcessoEdicao("p3d_producao");
  if (!acesso) return { error: "Gerar produção exige permissão de edição em Produção." };

  const { data, error } = await (await createClient()).rpc("p3d_gerar_producao_do_pedido", { p_pedido_id: pedidoId });
  if (error) return { error: mensagemRpc(error, "Não foi possível gerar a produção.") };

  revalidatePath(`${ROTA}/${pedidoId}`);
  revalidatePath("/impressao-3d/producao");
  return { ok: true, criados: typeof data === "number" ? data : Number(data) || 0 };
}

export type ResultadoPecasPedido = { error: string } | { ok: true; mensagem: string };

/**
 * Baixa do estoque de peças os itens do pedido que têm produto (p3d_baixar_pecas_pedido): não baixa
 * duas vezes e recusa se faltar peça (mensagem do banco, como veio). Exige edição em Pedidos E em Estoque.
 */
export async function baixarPecasPedido(pedidoId: string): Promise<ResultadoPecasPedido> {
  const acesso = await getAcessoEdicao(MODULO);
  const acessoEstoque = await getAcessoEdicao("p3d_estoque");
  if (!acesso || !acessoEstoque) return { error: "Baixar peças exige edição em Pedidos e em Estoque." };

  const { data, error } = await (await createClient()).rpc("p3d_baixar_pecas_pedido", { p_pedido_id: pedidoId });
  if (error) return { error: mensagemRpc(error, "Não foi possível baixar as peças do estoque.") };

  revalidatePath(`${ROTA}/${pedidoId}`);
  revalidatePath("/impressao-3d/estoque");
  return { ok: true, mensagem: textoBaixa(lerBaixaPecas(data)) };
}

/** Devolve ao estoque de peças os itens já baixados do pedido (motivo opcional). */
export async function devolverPecasPedido(pedidoId: string, motivo?: string): Promise<ResultadoPecasPedido> {
  const acesso = await getAcessoEdicao(MODULO);
  const acessoEstoque = await getAcessoEdicao("p3d_estoque");
  if (!acesso || !acessoEstoque) return { error: "Devolver peças exige edição em Pedidos e em Estoque." };

  const limpo = typeof motivo === "string" ? motivo.trim().slice(0, 300) : "";
  const { data, error } = await (await createClient()).rpc("p3d_devolver_pecas_pedido", {
    p_pedido_id: pedidoId,
    ...(limpo ? { p_motivo: limpo } : {}),
  });
  if (error) return { error: mensagemRpc(error, "Não foi possível devolver as peças ao estoque.") };

  const n = lerDevolucaoPecas(data).itens_devolvidos;
  revalidatePath(`${ROTA}/${pedidoId}`);
  revalidatePath("/impressao-3d/estoque");
  return { ok: true, mensagem: `${n} ${n === 1 ? "item devolvido" : "itens devolvidos"} ao estoque de peças.` };
}
