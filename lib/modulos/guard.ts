import { getModuloRegistro } from "@/lib/modulos/registry";
import { temPainelCompleto, ehPapelRestrito } from "@/lib/empresas";
import type { NivelPermissao, PermissaoModulo } from "@/lib/modulos/permissoes";

/**
 * Decisão pura do guard de módulo (getAcessoModulo em lib/empresa-ativa.ts),
 * separada do banco para ser testada de ponta a ponta. Não confere o RLS nem
 * a RPC tem_permissao — só aplica a regra: dono/cofundador com o módulo ligado
 * têm tudo; sócio/funcionário precisam de módulo ligado + permite_membros +
 * permissão do nível pedido. Qualquer dúvida (papel estranho, módulo
 * desconhecido, lista ausente) devolve null = nega.
 */
export interface EntradaGuard {
  modulo: string;
  papel: string | null | undefined;
  nivelMinimo: NivelPermissao;
  /** Módulos ligados na empresa (workspace_modulos). */
  habilitados: readonly string[];
  /** Módulos com modulos.permite_membros = true. */
  permiteMembros: readonly string[];
  /** Permissões próprias (permissoes_membro). Só vale para sócio/funcionário. */
  permissoes: readonly PermissaoModulo[];
}

export interface ResultadoGuard {
  ehDono: boolean;
  nivel: NivelPermissao;
  extras: string[];
}

export function resolverAcessoModulo(e: EntradaGuard): ResultadoGuard | null {
  if (!getModuloRegistro(e.modulo)) return null;
  const painel = temPainelCompleto(e.papel);
  if (!painel && !ehPapelRestrito(e.papel)) return null;
  if (!e.habilitados.includes(e.modulo)) return null;

  if (painel) return { ehDono: true, nivel: "edicao", extras: [] };

  if (!e.permiteMembros.includes(e.modulo)) return null;
  const p = e.permissoes.find((x) => x.modulo === e.modulo);
  if (!p) return null;
  if (e.nivelMinimo === "edicao" && p.nivel !== "edicao") return null;
  return { ehDono: false, nivel: p.nivel, extras: p.extras };
}
