import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  EMPRESA_ATIVA_COOKIE,
  EMPRESA_ATIVA_COOKIE_MAX_AGE,
  escolherEmpresa,
  listarEmpresas,
  type EmpresaVinculo,
} from "@/lib/empresas";

/**
 * A empresa ativa da requisição e tudo o que depende dela. É o ÚNICO ponto
 * por onde páginas e server actions descobrem "em qual empresa estou e com
 * que papel": o cookie (só o workspace_id) é uma dica, nunca uma prova — a
 * cada requisição o banco devolve as empresas com vínculo ativo
 * (minhas_empresas) e o cookie só vale se estiver nessa lista; senão cai em
 * uma empresa válida. Papel e dono vêm sempre do banco.
 */

export type EmpresaAtiva = EmpresaVinculo & {
  userId: string;
  email: string;
};

interface ContextoEmpresas {
  userId: string;
  email: string;
  empresas: EmpresaVinculo[];
  ativa: EmpresaAtiva | null;
}

const getContexto = cache(async (): Promise<ContextoEmpresas | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const empresas = await listarEmpresas(supabase);
  const cookieStore = await cookies();
  const escolhida = escolherEmpresa(empresas, cookieStore.get(EMPRESA_ATIVA_COOKIE)?.value);
  const email = user.email ?? "";

  return {
    userId: user.id,
    email,
    empresas,
    ativa: escolhida ? { ...escolhida, userId: user.id, email } : null,
  };
});

/** Empresa ativa (qualquer papel), ou null se a conta não tem vínculo nenhum. */
export async function getEmpresaAtiva(): Promise<EmpresaAtiva | null> {
  return (await getContexto())?.ativa ?? null;
}

/** Todas as empresas com vínculo ativo, para o seletor. */
export async function getEmpresasDoUsuario(): Promise<EmpresaVinculo[]> {
  return (await getContexto())?.empresas ?? [];
}

/**
 * Empresa ativa quando o usuário tem o painel completo nela (dono). Vendedor
 * não entra aqui: a interface dele é só /vendedor/*. Sócio entra na Fase 3,
 * por módulo e permissão.
 */
export async function getEmpresaPainel(): Promise<EmpresaAtiva | null> {
  const ativa = await getEmpresaAtiva();
  return ativa?.papel === "dono" ? ativa : null;
}

/** workspace_id da empresa ativa, só se o usuário tem o painel nela. */
export async function getWorkspaceIdAtivo(): Promise<string | null> {
  return (await getEmpresaPainel())?.workspaceId ?? null;
}

/** dono_id da empresa ativa (para o user_id das linhas), só com painel. */
export async function getDonoIdAtivo(): Promise<string | null> {
  return (await getEmpresaPainel())?.donoId ?? null;
}

/**
 * Grava a empresa ativa. Só server actions e route handlers podem escrever
 * cookie. O valor é só o id; quem lê sempre revalida.
 */
export async function gravarEmpresaAtiva(workspaceId: string) {
  const cookieStore = await cookies();
  cookieStore.set(EMPRESA_ATIVA_COOKIE, workspaceId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: EMPRESA_ATIVA_COOKIE_MAX_AGE,
  });
}

export async function limparEmpresaAtiva() {
  const cookieStore = await cookies();
  cookieStore.delete(EMPRESA_ATIVA_COOKIE);
}
