"use server";

import { revalidatePath } from "next/cache";
import { getAcessoEdicao, getWorkspaceIdAtivo } from "@/lib/empresa-ativa";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { exigeAprovacao } from "@/lib/aprovacoes";
import { sociosErrorMessage } from "@/lib/socios-shared";
import { JuridicoSchema } from "@/lib/validations/juridico";
import { ConviteSchema } from "@/lib/validations/colaborador";
import type { ActionState } from "@/lib/actions/types";

const SEM_PERMISSAO = "Você não tem permissão para fazer isso.";

function textOrNull(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const str = value.toString().trim();
  return str === "" ? null : str;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function parseJuridicoForm(formData: FormData) {
  return JuridicoSchema.safeParse({
    titulo: formData.get("titulo"),
    tipo: formData.get("tipo") ?? "Fiscal",
    prazo: textOrNull(formData.get("prazo")) ?? undefined,
    status: formData.get("status") ?? "pendente",
    nota: textOrNull(formData.get("nota")) ?? undefined,
  });
}

export async function createJuridico(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseJuridicoForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const acesso = await getAcessoEdicao("juridico");
  if (!acesso) return { error: SEM_PERMISSAO };

  const { supabase } = await requireUser();
  const { error } = await supabase.from("juridico").insert({
    user_id: acesso.donoId,
    workspace_id: acesso.workspaceId,
    titulo: parsed.data.titulo,
    tipo: parsed.data.tipo,
    prazo: parsed.data.prazo ?? null,
    status: parsed.data.status,
    nota: parsed.data.nota ?? null,
  });
  if (error) return { error: "Não foi possível salvar a pendência." };

  revalidatePath("/juridico");
  return { ok: true };
}

export async function updateJuridico(
  juridicoId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseJuridicoForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const acesso = await getAcessoEdicao("juridico");
  if (!acesso) return { error: SEM_PERMISSAO };

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("juridico")
    .update({
      titulo: parsed.data.titulo,
      tipo: parsed.data.tipo,
      prazo: parsed.data.prazo ?? null,
      status: parsed.data.status,
      nota: parsed.data.nota ?? null,
    })
    .eq("id", juridicoId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: "Não foi possível atualizar a pendência." };

  revalidatePath("/juridico");
  return { ok: true };
}

export async function deleteJuridico(juridicoId: string) {
  const acesso = await getAcessoEdicao("juridico");
  if (!acesso) return;

  const { supabase } = await requireUser();
  await supabase
    .from("juridico")
    .delete()
    .eq("id", juridicoId)
    .eq("workspace_id", acesso.workspaceId);
  revalidatePath("/juridico");
}

/**
 * `pendente: true` = a empresa tem 2+ fundadores: o convite foi só ENVIADO para
 * aprovação (ainda não existe, então não há link). Ver lib/aprovacoes-shared.ts.
 */
type ConviteActionState =
  | { error: string }
  | { ok: true; inviteUrl: string }
  | { ok: true; pendente: true }
  | undefined;

/** Resposta de remover/cancelar (usadas por /vendedores): `pendente` = aguardando os outros fundadores. */
export type ColaboradorActionState = { ok: true; pendente?: boolean } | { error: string };

async function getOrigin() {
  const h = await headers();
  const host = h.get("host");
  const proto =
    h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function convidarColaborador(
  _prevState: ConviteActionState,
  formData: FormData
): Promise<ConviteActionState> {
  const parsed = ConviteSchema.safeParse({
    email: formData.get("email"),
    papel: formData.get("papel"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  // O convite nasce vinculado à empresa ATIVA, em que o usuário é o dono.
  const workspaceId = await getWorkspaceIdAtivo();
  if (!workspaceId) return { error: "Selecione uma empresa em que você é o dono." };

  // Só o convite de vendedor passa por aqui (/vendedores); os papéis antigos de
  // colaborador (contador, advogado...) estão desligados e não têm RPC.
  if (parsed.data.papel !== "comercial") {
    return { error: "Este tipo de colaborador não está disponível." };
  }

  // Mesma mensagem de sempre para convite repetido (a RPC também recusa, com outro texto).
  const { data: existente } = await supabase
    .from("convites")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("email_convidado", parsed.data.email)
    .eq("status", "pendente")
    .maybeSingle();

  if (existente) {
    return { error: "Já existe um convite pendente para esse e-mail." };
  }

  // Convite pela RPC (a porta de aprovação entre fundadores vive nela). O vendedor
  // não leva matriz de permissões.
  const { data: token, error } = await supabase.rpc("convidar_membro", {
    p_workspace_id: workspaceId,
    p_email: parsed.data.email,
    p_papel: "comercial",
    p_permissoes: [],
  });
  if (error) {
    // Textos conhecidos da RPC (sem permissão, já faz parte...); o resto mantém a mensagem de sempre.
    const msg = sociosErrorMessage(error.message);
    return { error: msg.startsWith("Não foi possível concluir") ? "Não foi possível criar o convite." : msg };
  }

  revalidatePath("/juridico");
  revalidatePath("/vendedores");
  revalidatePath("/aprovacoes");

  // NULL = enviado para aprovação (2+ fundadores): o convite ainda não existe.
  if (typeof token !== "string" || !token) return { ok: true, pendente: true };

  const origin = await getOrigin();
  return { ok: true, inviteUrl: `${origin}/convite/${token}` };
}

/**
 * Remove o vínculo de um colaborador (hoje, vendedor) da empresa ativa. A tela
 * manda o id da LINHA de `membros`; a RPC remover_membro quer o id da PESSOA
 * (membros.membro_id), então ele é buscado aqui, sempre dentro da empresa ativa.
 */
export async function removerColaborador(membroId: string): Promise<ColaboradorActionState> {
  const { supabase } = await requireUser();
  // Só remove vínculo da empresa ativa (não de outra empresa do mesmo dono).
  const workspaceId = await getWorkspaceIdAtivo();
  if (!workspaceId) return { error: SEM_PERMISSAO };

  const { data: linha } = await supabase
    .from("membros")
    .select("membro_id")
    .eq("id", membroId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  const pessoaId = (linha as { membro_id: string } | null)?.membro_id;
  if (!pessoaId) return { error: "Colaborador não encontrado." };

  const pendente = await exigeAprovacao(supabase, workspaceId);
  const { error } = await supabase.rpc("remover_membro", {
    p_workspace_id: workspaceId,
    p_membro_id: pessoaId,
  });
  if (error) return { error: sociosErrorMessage(error.message) };

  revalidatePath("/juridico");
  revalidatePath("/vendedores");
  revalidatePath("/aprovacoes");
  return pendente ? { ok: true, pendente: true } : { ok: true };
}

export async function cancelarConvite(conviteId: string): Promise<ColaboradorActionState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  // A empresa vem do servidor; a RPC cancela_convite_empresa só mexe em convite pendente.
  const workspaceId = await getWorkspaceIdAtivo();
  if (!workspaceId) return { error: SEM_PERMISSAO };

  const pendente = await exigeAprovacao(supabase, workspaceId);
  const { error } = await supabase.rpc("cancelar_convite_empresa", { p_id: conviteId });
  if (error) return { error: sociosErrorMessage(error.message) };

  revalidatePath("/juridico");
  revalidatePath("/vendedores");
  revalidatePath("/aprovacoes");
  return pendente ? { ok: true, pendente: true } : { ok: true };
}
