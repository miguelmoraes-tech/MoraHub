"use server";

import { redirect } from "next/navigation";
import { getWorkspaceIdAtivo, gravarEmpresaAtiva } from "@/lib/empresa-ativa";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  ACESSO_VENDEDOR_AGUARDANDO,
  VENDEDOR_HOME,
  getVendedorAcesso,
} from "@/lib/vendedor-access";
import {
  CODIGO_VENDEDOR_LENGTH,
  gestorErrorMessage,
  solicitarAcessoErrorMessage,
  type SolicitacaoVendedorStatus,
} from "@/lib/vendedor-shared";
import type { ActionState } from "@/lib/actions/types";

// All the writes here are SECURITY DEFINER RPCs; the tables are read-only
// through RLS. These actions only validate input and translate errors.

// --- Vendedor side ---

export async function solicitarAcessoVendedor(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const codigo = String(formData.get("codigo") ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (codigo.length !== CODIGO_VENDEDOR_LENGTH) {
    return { error: "Informe o código completo do seu gestor (10 caracteres)." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("solicitar_acesso_vendedor", {
    p_codigo: codigo,
  });
  if (error) return { error: solicitarAcessoErrorMessage(error.message) };

  redirect(ACESSO_VENDEDOR_AGUARDANDO);
}

export type VerificacaoState = {
  /** Where the caller's latest request stands; "nenhuma" when there is none. */
  status: SolicitacaoVendedorStatus | "nenhuma";
};

/**
 * Called by the "aguardando aprovação" screen (polling and the "Verificar"
 * button). Once the gestor approved — i.e. an active comercial link exists —
 * it picks the company and sends the vendedor to their area, same as the
 * invite flow does. Otherwise it only reports the latest request's status.
 */
export async function verificarSolicitacaoVendedor(): Promise<VerificacaoState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const acesso = await getVendedorAcesso(supabase, user.id);
  if (acesso.vinculos.length > 0) {
    await gravarEmpresaAtiva(acesso.vinculos[0].workspace_id);
    redirect(VENDEDOR_HOME);
  }

  const { data } = await supabase
    .from("solicitacoes_vendedor")
    .select("status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { status: (data?.status as SolicitacaoVendedorStatus | undefined) ?? "nenhuma" };
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
