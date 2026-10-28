"use server";

import { revalidatePath } from "next/cache";
import { getAcessoEdicao, getWorkspaceIdAtivo } from "@/lib/empresa-ativa";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
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

type ConviteActionState =
  | { error: string }
  | { ok: true; inviteUrl: string }
  | undefined;

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

  const { data: existente } = await supabase
    .from("convites")
    .select("id")
    .eq("dono_id", user.id)
    .eq("workspace_id", workspaceId)
    .eq("email_convidado", parsed.data.email)
    .eq("status", "pendente")
    .maybeSingle();

  if (existente) {
    return { error: "Já existe um convite pendente para esse e-mail." };
  }

  const { data: convite, error } = await supabase
    .from("convites")
    .insert({
      dono_id: user.id,
      email_convidado: parsed.data.email,
      papel: parsed.data.papel,
      workspace_id: workspaceId,
    })
    .select("token")
    .single();

  if (error || !convite) return { error: "Não foi possível criar o convite." };

  revalidatePath("/juridico");
  revalidatePath("/vendedores");

  const origin = await getOrigin();
  return { ok: true, inviteUrl: `${origin}/convite/${convite.token}` };
}

export async function removerColaborador(membroId: string) {
  const { supabase } = await requireUser();
  // Só remove vínculo da empresa ativa (não de outra empresa do mesmo dono).
  const workspaceId = await getWorkspaceIdAtivo();
  if (!workspaceId) return;
  await supabase
    .from("membros")
    .update({ status: "removido" })
    .eq("id", membroId)
    .eq("workspace_id", workspaceId);
  revalidatePath("/juridico");
  revalidatePath("/vendedores");
}

export async function cancelarConvite(conviteId: string) {
  const { supabase, user } = await requireUser();
  if (!user) return;

  // Scoped to "pendente" so an invite that was already accepted/declined in
  // the meantime can't be wiped out by a stale button in the UI.
  const workspaceId = await getWorkspaceIdAtivo();
  if (!workspaceId) return;

  await supabase
    .from("convites")
    .delete()
    .eq("id", conviteId)
    .eq("dono_id", user.id)
    .eq("workspace_id", workspaceId)
    .eq("status", "pendente");

  revalidatePath("/juridico");
  revalidatePath("/vendedores");
}
