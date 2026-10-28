import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  EMPRESA_ATIVA_COOKIE,
  EMPRESA_ATIVA_COOKIE_MAX_AGE,
  escolherEmpresa,
  ehPapelRestrito,
  listarEmpresas,
  temPainelCompleto,
  type EmpresaVinculo,
} from "@/lib/empresas";
import {
  lerPermissoesProprias,
  type ModuloComPermissao,
  type NivelPermissao,
} from "@/lib/modulos/permissoes";

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
 * Empresa ativa quando o usuário tem o painel completo nela (fundador ou
 * cofundador). Vendedor não entra aqui (a interface dele é só /vendedor/*) e
 * sócio/funcionário só enxergam o que as permissões deles liberam
 * (getAcessoModulo / getAcessoEdicao).
 */
export async function getEmpresaPainel(): Promise<EmpresaAtiva | null> {
  const ativa = await getEmpresaAtiva();
  return ativa && temPainelCompleto(ativa.papel) ? ativa : null;
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

// --- Sócios e funcionários: acesso por módulo ---

export interface AcessoModulo {
  workspaceId: string;
  /** dono_id da empresa: é o user_id das linhas criadas. */
  donoId: string;
  userId: string;
  /** Painel completo (fundador/cofundador): vê e edita tudo do módulo. */
  completo: boolean;
  nivel: NivelPermissao;
  /** Extras de tela liberados (ex.: "contato"). Só interface, não é barreira. */
  extras: string[];
}

/** O extra vale para o painel completo e para quem o recebeu na permissão. */
export function temExtra(acesso: AcessoModulo, extra: string): boolean {
  return acesso.completo || acesso.extras.includes(extra);
}

/**
 * O que a empresa ativa deixa o usuário ver de um módulo: o painel completo
 * vê tudo; sócio/funcionário, só o que `permissoes_membro` (leitura própria)
 * lista. Qualquer outra coisa, ou falha de leitura, devolve null (nega).
 */
export async function getAcessoModulo(modulo: ModuloComPermissao): Promise<AcessoModulo | null> {
  const ativa = await getEmpresaAtiva();
  if (!ativa) return null;
  const base = { workspaceId: ativa.workspaceId, donoId: ativa.donoId, userId: ativa.userId };

  if (temPainelCompleto(ativa.papel)) {
    return { ...base, completo: true, nivel: "edicao", extras: [] };
  }
  if (!ehPapelRestrito(ativa.papel)) return null;

  const supabase = await createClient();
  const permissoes = await lerPermissoesProprias(supabase, ativa.workspaceId, ativa.userId);
  const p = permissoes.find((x) => x.modulo === modulo);
  return p ? { ...base, completo: false, nivel: p.nivel, extras: p.extras } : null;
}

/**
 * Guarda das actions de escrita: fundador/cofundador, OU quem tem
 * tem_permissao(empresa, módulo, 'edicao') no banco. O RLS continua sendo a
 * barreira real; isto evita tentar (e dá mensagem clara). Falha = null.
 */
export async function getAcessoEdicao(modulo: ModuloComPermissao): Promise<AcessoModulo | null> {
  const ativa = await getEmpresaAtiva();
  if (!ativa) return null;
  const base = { workspaceId: ativa.workspaceId, donoId: ativa.donoId, userId: ativa.userId };

  if (temPainelCompleto(ativa.papel)) {
    return { ...base, completo: true, nivel: "edicao", extras: [] };
  }
  if (!ehPapelRestrito(ativa.papel)) return null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("tem_permissao", {
      p_ws: ativa.workspaceId,
      p_modulo: modulo,
      p_nivel: "edicao",
    });
    if (error || data !== true) return null;
    const permissoes = await lerPermissoesProprias(supabase, ativa.workspaceId, ativa.userId);
    const extras = permissoes.find((x) => x.modulo === modulo)?.extras ?? [];
    return { ...base, completo: false, nivel: "edicao", extras };
  } catch {
    return null;
  }
}
