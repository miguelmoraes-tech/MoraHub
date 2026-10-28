import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Empresas de uma conta e escolha da empresa ativa — sem dependência de
 * next/headers, para servir ao proxy (que monta o próprio client) e às telas.
 *
 * Uma conta = uma pessoa. O papel é POR EMPRESA: dono, vendedor (comercial) ou
 * sócio. O cookie guarda só o workspace_id escolhido; o banco é quem diz se
 * a conta ainda tem vínculo e qual é o papel (RPCs minhas_empresas /
 * meu_papel_na_empresa, ambas revalidadas a cada requisição).
 */

export const EMPRESA_ATIVA_COOKIE = "empresa-ativa";
export const EMPRESA_ATIVA_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Papéis que têm interface hoje. Vínculos legados (financeiro, rh...) estão fora do ar. */
export const PAPEIS_COM_INTERFACE = ["dono", "socio", "comercial"] as const;
export type PapelEmpresa = (typeof PAPEIS_COM_INTERFACE)[number];

export interface EmpresaVinculo {
  workspaceId: string;
  nome: string | null;
  papel: PapelEmpresa;
  donoId: string;
}

export const PAPEL_ROTULO: Record<PapelEmpresa, string> = {
  dono: "Dono",
  socio: "Sócio",
  comercial: "Vendedor",
};

export function temInterface(papel: string | null | undefined): papel is PapelEmpresa {
  return !!papel && (PAPEIS_COM_INTERFACE as readonly string[]).includes(papel);
}

/** Todas as empresas em que a conta é dono, sócio ou vendedor (vínculo ativo). */
export async function listarEmpresas(supabase: SupabaseClient): Promise<EmpresaVinculo[]> {
  const { data } = await supabase.rpc("minhas_empresas");
  const linhas = (data ?? []) as {
    workspace_id: string;
    nome: string | null;
    papel: string;
    dono_id: string;
  }[];
  return linhas
    .filter((l) => temInterface(l.papel))
    .map((l) => ({
      workspaceId: l.workspace_id,
      nome: l.nome,
      papel: l.papel as PapelEmpresa,
      donoId: l.dono_id,
    }));
}

/**
 * A empresa do cookie, se a conta ainda tem vínculo com ela; senão cai numa
 * válida: dono primeiro (painel completo), depois sócio, depois vendedor.
 */
export function escolherEmpresa(
  empresas: EmpresaVinculo[],
  cookie: string | undefined
): EmpresaVinculo | null {
  const doCookie = cookie ? empresas.find((e) => e.workspaceId === cookie) : undefined;
  if (doCookie) return doCookie;
  for (const papel of PAPEIS_COM_INTERFACE) {
    const achada = empresas.find((e) => e.papel === papel);
    if (achada) return achada;
  }
  return null;
}

/**
 * Caminho curto para o proxy: com cookie, uma única RPC (meu_papel_na_empresa)
 * confirma vínculo e papel; só se o cookie faltar ou não valer é que lista as
 * empresas. `corrigirCookie` avisa que o cookie deve ser regravado.
 */
export async function resolverEmpresaAtiva(
  supabase: SupabaseClient,
  cookie: string | undefined
): Promise<{ workspaceId: string; papel: PapelEmpresa; corrigirCookie: boolean } | null> {
  if (cookie) {
    const { data: papel } = await supabase.rpc("meu_papel_na_empresa", {
      p_workspace_id: cookie,
    });
    if (temInterface(papel)) return { workspaceId: cookie, papel, corrigirCookie: false };
  }
  const escolhida = escolherEmpresa(await listarEmpresas(supabase), undefined);
  return escolhida
    ? { workspaceId: escolhida.workspaceId, papel: escolhida.papel, corrigirCookie: true }
    : null;
}
