"use server";

import { redirect } from "next/navigation";
import { getWorkspaceIdAtivo, gravarEmpresaAtiva } from "@/lib/empresa-ativa";
import { listarEmpresas } from "@/lib/empresas";
import { HOME_DONO } from "@/lib/modulos/registry";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACESSO_VENDEDOR_AGUARDANDO, VENDEDOR_HOME } from "@/lib/vendedor-access";
import {
  CODIGO_ACESSO_MIN,
  gestorErrorMessage,
  limparCodigoAcesso,
  solicitarAcessoErrorMessage,
  type SolicitacaoVendedorStatus,
} from "@/lib/vendedor-shared";
import type { ActionState } from "@/lib/actions/types";

// All the writes here are SECURITY DEFINER RPCs; the tables are read-only
// through RLS. These actions only validate input and translate errors.

// --- Vendedor side ---

/**
 * Pede acesso a uma empresa com um código: o de vendedor ou o de um setor
 * (RPC solicitar_acesso, que descobre de qual dos dois é). Qualquer conta
 * logada pode usar — tenha ou não empresa.
 */
export async function solicitarAcesso(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const codigo = limparCodigoAcesso(String(formData.get("codigo") ?? ""));
  if (codigo.length < CODIGO_ACESSO_MIN) {
    return { error: "Informe o código completo que a empresa te passou." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("solicitar_acesso", { p_codigo: codigo });
  if (error) return { error: solicitarAcessoErrorMessage(error.message) };

  redirect(ACESSO_VENDEDOR_AGUARDANDO);
}

export type VerificacaoState = {
  /** Where the caller's latest request stands; "nenhuma" when there is none. */
  status: SolicitacaoVendedorStatus | "nenhuma";
};

/**
 * Se o pedido MAIS RECENTE da conta foi aprovado e a empresa já aparece entre
 * os vínculos ativos, ativa essa empresa (cookie) e leva para a casa do papel
 * que ela recebeu: vendedor para a área dele, os demais para o painel (o proxy
 * leva sócio/funcionário à primeira tela liberada). Redireciona; quando não há
 * o que ativar, apenas devolve o status do último pedido.
 */
async function ativarEmpresaAprovada(): Promise<VerificacaoState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("solicitacoes_vendedor")
    .select("status, workspace_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const status = (data?.status as SolicitacaoVendedorStatus | undefined) ?? "nenhuma";
  if (status === "aprovado") {
    const alvo = (await listarEmpresas(supabase)).find(
      (e) => e.workspaceId === data?.workspace_id
    );
    if (alvo) {
      await gravarEmpresaAtiva(alvo.workspaceId);
      redirect(alvo.papel === "comercial" ? VENDEDOR_HOME : HOME_DONO);
    }
  }
  return { status };
}

/**
 * Called by the "aguardando aprovação" screen (realtime, polling and the
 * "Verificar" button) and by its page when the answer is already "aprovado".
 */
export async function verificarSolicitacaoVendedor(): Promise<VerificacaoState> {
  return ativarEmpresaAprovada();
}

/** Para a página "aguardando": pedido já aprovado entra direto na empresa. */
export async function entrarSeAprovado(): Promise<void> {
  await ativarEmpresaAprovada();
}

// --- Gestor (dono) side ---

export type CodigoState = { codigo: string } | { error: string };

export async function regenerarCodigoVendedor(): Promise<CodigoState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const workspaceId = await getWorkspaceIdAtivo();
  if (!workspaceId) return { error: "Workspace empresarial não encontrado." };

  const { data, error } = await supabase.rpc("regenerar_codigo_vendedor", {
    p_workspace_id: workspaceId,
  });
  if (error || typeof data !== "string") {
    return { error: gestorErrorMessage(error?.message) };
  }
  return { codigo: data };
}

/**
 * Aprova ou recusa QUALQUER pedido de acesso (vendedor ou setor). Quando o
 * pedido é de vendedor, o banco delega à função antiga: nada muda para eles.
 */
export async function responderSolicitacaoAcesso(
  id: string,
  aprovar: boolean
): Promise<NonNullable<ActionState>> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("responder_solicitacao_acesso", {
    p_id: id,
    p_aprovar: aprovar,
  });
  if (error) return { error: gestorErrorMessage(error.message) };

  revalidatePath("/vendedores");
  revalidatePath("/socios");
  return { ok: true };
}

export async function responderSolicitacaoVendedor(
  id: string,
  aprovar: boolean
): Promise<NonNullable<ActionState>> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("responder_solicitacao_vendedor", {
    p_id: id,
    p_aprovar: aprovar,
  });
  if (error) return { error: gestorErrorMessage(error.message) };

  revalidatePath("/vendedores");
  return { ok: true };
}
