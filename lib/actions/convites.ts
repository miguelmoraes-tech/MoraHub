"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VENDEDOR_HOME } from "@/lib/vendedor-access";
import { listarEmpresas } from "@/lib/empresas";
import { gravarEmpresaAtiva } from "@/lib/empresa-ativa";
import { HOME_DONO } from "@/lib/modulos/registry";

export type ConviteResponseState = { error: string } | undefined;

const ERROR_MESSAGES: Record<string, string> = {
  not_authenticated: "Faça login para aceitar o convite.",
  convite_nao_encontrado: "Convite não encontrado.",
  convite_ja_respondido: "Este convite já foi respondido.",
  convite_expirado: "Este convite expirou.",
  email_nao_confere: "Este convite foi enviado para outro e-mail.",
  convite_sem_empresa: "Este convite não está ligado a nenhuma empresa.",
  convite_proprio: "Você não pode aceitar um convite da sua própria empresa.",
};

function friendlyError(message: string | undefined) {
  if (!message) return "Não foi possível concluir a ação.";
  const code = Object.keys(ERROR_MESSAGES).find((key) => message.includes(key));
  return code ? ERROR_MESSAGES[code] : "Não foi possível concluir a ação.";
}

export async function aceitarConvite(
  token: string,
  _prevState: ConviteResponseState,
  _formData: FormData
): Promise<ConviteResponseState> {
  const supabase = await createClient();
  const { data: workspaceId, error } = await supabase.rpc("aceitar_convite_workspace", {
    p_token: token,
  });

  if (error || typeof workspaceId !== "string" || !workspaceId) {
    return { error: friendlyError(error?.message) };
  }

  // Vale para todos os papéis: a empresa devolvida passa a ser a ativa e o
  // destino depende do papel NELA (vendedor: área dele; os demais: o painel, e
  // o proxy leva sócio/funcionário à primeira tela que as permissões liberam).
  await gravarEmpresaAtiva(workspaceId);
  const nova = (await listarEmpresas(supabase)).find((e) => e.workspaceId === workspaceId);
  redirect(nova?.papel === "comercial" ? VENDEDOR_HOME : HOME_DONO);
}

export async function recusarConvite(
  token: string,
  _prevState: ConviteResponseState,
  _formData: FormData
): Promise<ConviteResponseState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("recusar_convite", { p_token: token });

  if (error) return { error: friendlyError(error.message) };

  redirect(`/convite/${token}`);
}
