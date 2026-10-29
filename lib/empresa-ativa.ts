import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  EMPRESA_ATIVA_COOKIE,
  EMPRESA_ATIVA_COOKIE_MAX_AGE,
  escolherEmpresa,
  listarEmpresas,
  temPainelCompleto,
  type EmpresaVinculo,
} from "@/lib/empresas";
import { lerPermissoesProprias, type NivelPermissao } from "@/lib/modulos/permissoes";
import { getModulosHabilitados, getModulosPermiteMembros } from "@/lib/modulos/habilitados";
import { getModuloRegistro } from "@/lib/modulos/registry";
import { resolverAcessoModulo } from "@/lib/modulos/guard";

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

// --- Acesso por módulo (guard genérico) ---

export interface AcessoModulo {
  workspaceId: string;
  /** dono_id da empresa: é o user_id das linhas criadas. */
  donoId: string;
  userId: string;
  /** Fundador/cofundador: vê e edita tudo do módulo (e nada de equipe passa por aqui). */
  ehDono: boolean;
  nivel: NivelPermissao;
  /** Extras de tela liberados (ex.: "contato", "valores"). Só interface, não é barreira. */
  extras: string[];
}

/** O extra vale para fundador/cofundador e para quem o recebeu na permissão. */
export function temExtra(acesso: AcessoModulo, extra: string): boolean {
  return acesso.ehDono || acesso.extras.includes(extra);
}

/** Permissões do próprio usuário, lidas uma vez por requisição. */
const getPermissoesProprias = cache(async (workspaceId: string, userId: string) =>
  lerPermissoesProprias(await createClient(), workspaceId, userId)
);

/**
 * O que a empresa ativa deixa o usuário fazer num módulo. Fundador e
 * cofundador têm acesso total; sócio/funcionário, só com o módulo ligado na
 * empresa, `modulos.permite_membros = true` e uma linha em `permissoes_membro`
 * (leitura própria) do nível pedido. Para `edicao`, o banco confirma de novo
 * (tem_permissao). Em todos os casos o módulo precisa estar HABILITADO na
 * empresa. Qualquer outra coisa, ou falha de leitura, devolve null (nega).
 * O RLS segue sendo a barreira real; isto evita tentar e dá mensagem clara.
 */
export async function getAcessoModulo(
  modulo: string,
  nivelMinimo: NivelPermissao = "leitura"
): Promise<AcessoModulo | null> {
  if (!getModuloRegistro(modulo)) return null;
  const ativa = await getEmpresaAtiva();
  if (!ativa) return null;
  const base = { workspaceId: ativa.workspaceId, donoId: ativa.donoId, userId: ativa.userId };
  const painel = temPainelCompleto(ativa.papel);

  try {
    const [habilitados, permiteMembros, permissoes] = await Promise.all([
      getModulosHabilitados(ativa.workspaceId),
      painel ? Promise.resolve([] as string[]) : getModulosPermiteMembros(),
      painel ? Promise.resolve([]) : getPermissoesProprias(ativa.workspaceId, ativa.userId),
    ]);
    const r = resolverAcessoModulo({
      modulo,
      papel: ativa.papel,
      nivelMinimo,
      habilitados,
      permiteMembros,
      permissoes,
    });
    if (!r) return null;

    // Edição de sócio/funcionário: o banco confirma de novo (tem_permissao).
    if (!r.ehDono && nivelMinimo === "edicao") {
      const { data, error } = await (await createClient()).rpc("tem_permissao", {
        p_ws: ativa.workspaceId,
        p_modulo: modulo,
        p_nivel: "edicao",
      });
      if (error || data !== true) return null;
    }
    return { ...base, ...r };
  } catch {
    return null;
  }
}

/** Guarda das actions de escrita: o mesmo guard, exigindo edição. */
export async function getAcessoEdicao(modulo: string): Promise<AcessoModulo | null> {
  return getAcessoModulo(modulo, "edicao");
}

/**
 * Módulos só do fundador/cofundador: além do guard, exige ser dono. Mesmo
 * que o catálogo mude, a equipe nunca passa por aqui.
 */
export async function getAcessoSoDono(modulo: string): Promise<AcessoModulo | null> {
  const acesso = await getAcessoModulo(modulo, "edicao");
  return acesso?.ehDono ? acesso : null;
}
