"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { HOME_DONO } from "@/lib/modulos/registry";
import { HUB_MODE_COOKIE } from "@/lib/hub-mode";
import {
  EMPRESA_NOME_MAX,
  EMPRESA_NOME_MIN,
} from "@/lib/empresa";
import { garantirPerfil, garantirTipoAtivo, temEmpresaPropria } from "@/lib/perfil";
import type { ActionState } from "@/lib/actions/types";

/**
 * Cria a primeira empresa da conta (fluxo atual: uma linha 'empresarial' em
 * perfis_tipos_ativos — o trigger do banco liga os módulos padrão). Na Fase 2
 * isto passa a chamar criar_empresa. Quem já tem empresa não cria outra aqui.
 */
export async function criarEmpresaInicial(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const nome = String(formData.get("nome") ?? "").trim();
  if (nome.length < EMPRESA_NOME_MIN || nome.length > EMPRESA_NOME_MAX) {
    return {
      error: `O nome da empresa deve ter entre ${EMPRESA_NOME_MIN} e ${EMPRESA_NOME_MAX} caracteres.`,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await garantirPerfil(supabase, user);

  if (!(await temEmpresaPropria(supabase, user.id))) {
    const { ok } = await garantirTipoAtivo(supabase, user.id, "empresarial", nome);
    if (!ok) return { error: "Não foi possível criar a empresa. Tente novamente." };
  }

  const cookieStore = await cookies();
  cookieStore.set(HUB_MODE_COOKIE, "business", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  redirect(HOME_DONO);
}
