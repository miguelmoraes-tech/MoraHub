"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { HOME_DONO } from "@/lib/modulos/registry";
import { HUB_MODE_COOKIE } from "@/lib/hub-mode";
import { VENDEDOR_HOME } from "@/lib/vendedor-access";
import { EMPRESA_NOME_MAX, EMPRESA_NOME_MIN } from "@/lib/empresa";
import { listarEmpresas } from "@/lib/empresas";
import { getEmpresaPainel, gravarEmpresaAtiva } from "@/lib/empresa-ativa";
import { garantirPerfil } from "@/lib/perfil";
import type { ActionState } from "@/lib/actions/types";

function validarNome(bruto: FormDataEntryValue | null): { nome: string } | { error: string } {
  const nome = String(bruto ?? "").trim();
  if (nome.length < EMPRESA_NOME_MIN || nome.length > EMPRESA_NOME_MAX) {
    return {
      error: `O nome da empresa deve ter entre ${EMPRESA_NOME_MIN} e ${EMPRESA_NOME_MAX} caracteres.`,
    };
  }
  return { nome };
}

function erroDaEmpresa(message: string | undefined): string {
  if (message?.includes("Limite de 5")) {
    return "Você atingiu o limite de 5 empresas por conta.";
  }
  if (message?.includes("Sem permissão") || message?.includes("sem permissão")) {
    return "Só o dono da empresa pode fazer isso.";
  }
  return "Não foi possível concluir a ação. Tente novamente.";
}

/**
 * Cria uma empresa PRÓPRIA para a conta logada (criar_empresa: o banco cria a
 * linha 'empresarial', liga os módulos padrão e impõe o limite de 5) e já a
 * torna a ativa. Vale para quem nunca teve empresa e para quem já tem — um
 * funcionário continua com o acesso às empresas onde trabalha.
 */
export async function criarEmpresa(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const validado = validarNome(formData.get("nome"));
  if ("error" in validado) return validado;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await garantirPerfil(supabase, user);

  const { data: workspaceId, error } = await supabase.rpc("criar_empresa", {
    p_nome: validado.nome,
  });
  if (error || typeof workspaceId !== "string") return { error: erroDaEmpresa(error?.message) };

  await gravarEmpresaAtiva(workspaceId);
  const cookieStore = await cookies();
  cookieStore.set(HUB_MODE_COOKIE, "business", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
  redirect(HOME_DONO);
}

/**
 * Troca a empresa ativa sem logout. O id vem do cliente, então só vale se
 * estiver entre as empresas com vínculo ativo da conta (minhas_empresas).
 */
export async function selecionarEmpresa(workspaceId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const alvo = (await listarEmpresas(supabase)).find((e) => e.workspaceId === workspaceId);
  if (!alvo) redirect(HOME_DONO);

  await gravarEmpresaAtiva(alvo.workspaceId);
  revalidatePath("/", "layout");
  // A interface depende do papel na empresa: vendedor só tem /vendedor/*.
  redirect(alvo.papel === "comercial" ? VENDEDOR_HOME : HOME_DONO);
}

/** Renomeia a empresa ativa. A empresa vem do servidor; o banco confere que é o dono. */
export async function renomearEmpresa(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const validado = validarNome(formData.get("nome"));
  if ("error" in validado) return validado;

  const empresa = await getEmpresaPainel();
  if (!empresa) return { error: "Só o dono da empresa pode renomeá-la." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("renomear_empresa", {
    p_workspace_id: empresa.workspaceId,
    p_nome: validado.nome,
  });
  if (error) return { error: erroDaEmpresa(error.message) };

  revalidatePath("/", "layout");
  return { ok: true };
}
