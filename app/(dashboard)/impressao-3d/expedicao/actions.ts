"use server";

import { revalidatePath } from "next/cache";
import { getAcessoEdicao } from "@/lib/empresa-ativa";
import { createClient } from "@/lib/supabase/server";
import { mensagemEscrita, mensagemRpc } from "@/lib/impressao-3d/erros";
import { SEM_PERMISSAO } from "@/lib/impressao-3d/regras";
import { formParaObjeto, primeiroErro } from "@/lib/impressao-3d/validacao";
import { EnvioSchema, StatusEnvioSchema } from "@/lib/impressao-3d/validacao-operacao";
import type { ActionState } from "@/lib/actions/types";

const MODULO = "p3d_expedicao";
const ROTA = "/impressao-3d/expedicao";
const STATUS_ALVO = ["postado", "em_transito", "entregue", "devolvido", "problema"];

function revalidarTudo() {
  revalidatePath(ROTA);
  revalidatePath("/impressao-3d/pedidos");
}

/**
 * Envio: insert/update direto SÓ de pedido_id (na criação), transportadora, servico,
 * codigo_rastreio, url_rastreio, custo_frete, peso_kg, volumes, previsao_entrega e
 * observacoes. status, postado_em, entregue_em e recebedor são do banco (RPC): nunca vão
 * no payload. O pedido precisa estar pronto ou enviado (o banco confere). O rastreio é
 * manual: não há integração com transportadoras/Correios.
 */
export async function criarEnvio(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = EnvioSchema.safeParse(formParaObjeto(formData));
  if (!parsed.success) return { error: primeiroErro(parsed.error) };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const { error } = await (await createClient())
    .from("p3d_envios")
    .insert({ workspace_id: acesso.workspaceId, ...parsed.data });
  if (error) return { error: mensagemEscrita(error, "Não foi possível criar o envio. O pedido precisa estar pronto ou enviado.") };

  revalidarTudo();
  return { ok: true };
}

export async function atualizarEnvio(envioId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  // O pedido de um envio não muda.
  const parsed = EnvioSchema.omit({ pedido_id: true }).safeParse(formParaObjeto(formData));
  if (!parsed.success) return { error: primeiroErro(parsed.error) };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const { data, error } = await (await createClient())
    .from("p3d_envios")
    .update(parsed.data)
    .eq("id", envioId)
    .eq("workspace_id", acesso.workspaceId)
    .select("id");
  if (error) return { error: mensagemEscrita(error, "Não foi possível atualizar o envio.") };
  if (!data || data.length === 0) return { error: "Envio não encontrado." };

  revalidatePath(ROTA);
  return { ok: true };
}

/** Só envio em preparação. */
export async function excluirEnvio(envioId: string): Promise<ActionState> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const { data, error } = await (await createClient())
    .from("p3d_envios")
    .delete()
    .eq("id", envioId)
    .eq("workspace_id", acesso.workspaceId)
    .eq("status", "preparando")
    .select("id");
  if (error) return { error: mensagemEscrita(error, "Não foi possível excluir o envio.") };
  if (!data || data.length === 0) return { error: "Só envios em preparação podem ser excluídos." };

  revalidatePath(ROTA);
  return { ok: true };
}

/**
 * preparando→postado; postado→em_transito|entregue|problema|devolvido; em_transito→entregue|
 * problema|devolvido; problema→em_transito|entregue|devolvido. Postar leva o pedido a "enviado";
 * entregar o último envio leva o pedido a "entregue" (a RPC faz).
 */
export async function mudarStatusEnvio(envioId: string, status: string, formData: FormData): Promise<ActionState> {
  const parsed = StatusEnvioSchema.safeParse(formParaObjeto(formData));
  if (!parsed.success) return { error: primeiroErro(parsed.error) };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };
  if (!STATUS_ALVO.includes(status)) return { error: "Status inválido." };
  const { data, recebedor } = parsed.data;

  const { error } = await (await createClient()).rpc("p3d_mudar_status_envio", {
    p_envio_id: envioId,
    p_status: status,
    ...(data ? { p_data: data } : {}),
    ...(status === "entregue" && recebedor ? { p_recebedor: recebedor } : {}),
  });
  if (error) return { error: mensagemRpc(error, "Não foi possível mudar o status do envio.") };

  revalidarTudo();
  return { ok: true };
}
