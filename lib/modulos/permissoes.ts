import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Permissões por módulo de sócios e funcionários (tabela `permissoes_membro`,
 * RLS: o próprio membro lê as suas; o dono/cofundador lê todas). Sem
 * dependência de servidor nem de React — também é importado pelo proxy.
 *
 * O RLS é a barreira real; o que se faz aqui só decide o que a interface e as
 * rotas mostram. Qualquer falha de leitura devolve lista vazia, que NEGA.
 */

/** Módulos que têm RLS de membro por ora: os únicos que podem receber permissão. */
export const MODULOS_COM_PERMISSAO = ["leads", "renegados", "clientes", "agenda"] as const;
export type ModuloComPermissao = (typeof MODULOS_COM_PERMISSAO)[number];

export type NivelPermissao = "leitura" | "edicao";

export interface PermissaoModulo {
  modulo: string;
  nivel: NivelPermissao;
  /** Opções extras de tela (ex.: leads/contato). Não são barreira de segurança. */
  extras: string[];
}

export function ehModuloComPermissao(chave: string): chave is ModuloComPermissao {
  return (MODULOS_COM_PERMISSAO as readonly string[]).includes(chave);
}

/** Nível válido ou null: valor desconhecido nunca vira permissão. */
export function nivelValido(valor: unknown): NivelPermissao | null {
  return valor === "leitura" || valor === "edicao" ? valor : null;
}

/**
 * Normaliza o jsonb de permissões ([{modulo, nivel, extras}]) vindo do banco
 * ou de um formulário. Descarta tudo o que não é módulo com permissão ou
 * nível válido, e módulos repetidos (vale o primeiro).
 */
export function normalizarPermissoes(bruto: unknown): PermissaoModulo[] {
  if (!Array.isArray(bruto)) return [];
  const vistos = new Set<string>();
  const saida: PermissaoModulo[] = [];
  for (const item of bruto) {
    if (!item || typeof item !== "object") continue;
    const { modulo, nivel, extras } = item as Record<string, unknown>;
    const n = nivelValido(nivel);
    if (typeof modulo !== "string" || !ehModuloComPermissao(modulo) || !n) continue;
    if (vistos.has(modulo)) continue;
    vistos.add(modulo);
    saida.push({
      modulo,
      nivel: n,
      extras: Array.isArray(extras) ? extras.filter((e): e is string => typeof e === "string") : [],
    });
  }
  return saida;
}

/** Chaves dos módulos com alguma permissão (leitura ou edição). */
export function modulosDasPermissoes(permissoes: readonly PermissaoModulo[]): string[] {
  return permissoes.map((p) => p.modulo);
}

/** Interseção na ordem do array de habilitados: módulos que a pessoa pode abrir. */
export function modulosVisiveis(
  habilitados: readonly string[],
  permitidos: readonly string[]
): string[] {
  return habilitados.filter((m) => permitidos.includes(m) && ehModuloComPermissao(m));
}

/**
 * Permissões do PRÓPRIO usuário numa empresa (select de permissoes_membro).
 * Falha = lista vazia = nega.
 */
export async function lerPermissoesProprias(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string
): Promise<PermissaoModulo[]> {
  try {
    const { data, error } = await supabase
      .from("permissoes_membro")
      .select("modulo_chave, nivel, extras")
      .eq("workspace_id", workspaceId)
      .eq("membro_id", userId);
    if (error) return [];
    return normalizarPermissoes(
      ((data ?? []) as { modulo_chave: string; nivel: string; extras: string[] | null }[]).map(
        (r) => ({ modulo: r.modulo_chave, nivel: r.nivel, extras: r.extras ?? [] })
      )
    );
  } catch {
    return [];
  }
}
