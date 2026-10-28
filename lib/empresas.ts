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

function paraVinculos(data: unknown): EmpresaVinculo[] {
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
 * Todas as empresas em que a conta é dono, sócio ou vendedor (vínculo ativo),
 * na ordem do banco: donos primeiro, da mais antiga para a mais nova. Falha de
 * leitura devolve lista vazia (nega por padrão: sem empresa, sem dados).
 */
export async function listarEmpresas(supabase: SupabaseClient): Promise<EmpresaVinculo[]> {
  try {
    const { data, error } = await supabase.rpc("minhas_empresas");
    return error ? [] : paraVinculos(data);
  } catch {
    return [];
  }
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

/** Só UUID de verdade vai para a RPC: cookie com lixo é tratado como ausente. */
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ResolucaoEmpresa =
  /** Empresa ativa válida, com o papel confirmado pelo banco. */
  | { status: "ok"; workspaceId: string; papel: PapelEmpresa; corrigirCookie: boolean }
  /** A conta não tem vínculo ativo com nenhuma empresa que tenha interface. */
  | { status: "sem_empresa" }
  /** O cookie aponta para uma empresa em que o papel não tem interface (financeiro, rh...). */
  | { status: "legado"; workspaceId: string; papel: string }
  /** Não deu para consultar (RPC, rede): nega, nunca presume dono. */
  | { status: "erro" };

/**
 * Caminho curto para o proxy: com cookie, uma única RPC (meu_papel_na_empresa)
 * confirma vínculo e papel; só se o cookie faltar ou não valer (empresa alheia,
 * vínculo removido) é que lista as empresas e cai numa válida
 * (`corrigirCookie`). Qualquer falha de consulta vira `erro`.
 */
export async function resolverEmpresaAtiva(
  supabase: SupabaseClient,
  cookie: string | undefined
): Promise<ResolucaoEmpresa> {
  try {
    if (cookie && UUID_RE.test(cookie)) {
      const { data: papel, error } = await supabase.rpc("meu_papel_na_empresa", {
        p_workspace_id: cookie,
      });
      if (error) return { status: "erro" };
      if (temInterface(papel)) {
        return { status: "ok", workspaceId: cookie, papel, corrigirCookie: false };
      }
      if (typeof papel === "string" && papel !== "") {
        return { status: "legado", workspaceId: cookie, papel };
      }
      // papel nulo: empresa alheia ou vínculo encerrado — cai no fallback.
    }
    const { data, error } = await supabase.rpc("minhas_empresas");
    if (error) return { status: "erro" };
    const escolhida = escolherEmpresa(paraVinculos(data), undefined);
    return escolhida
      ? {
          status: "ok",
          workspaceId: escolhida.workspaceId,
          papel: escolhida.papel,
          corrigirCookie: true,
        }
      : { status: "sem_empresa" };
  } catch {
    return { status: "erro" };
  }
}
