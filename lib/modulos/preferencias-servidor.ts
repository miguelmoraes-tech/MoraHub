import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getEmpresaAtiva } from "@/lib/empresa-ativa";
import { abasVisiveis, lerPreferencia, resolverPreferencia, type Preferencia } from "@/lib/modulos/preferencias";
import { ehPapelRestrito, temPainelCompleto } from "@/lib/empresas";
import { getModulosHabilitados, getModulosPermiteMembros } from "@/lib/modulos/habilitados";
import { lerPermissoesProprias, modulosDasPermissoes, modulosVisiveis } from "@/lib/modulos/permissoes";

export interface PreferenciasNavegacao {
  /** Linha pessoal (user_id = eu). */
  pessoal: Preferencia | null;
  /** Padrão da empresa (user_id nulo). */
  padrao: Preferencia | null;
  /** A que vale: pessoal, senão padrão, senão null (ordem do registro). */
  efetiva: Preferencia | null;
}

const NENHUMA: PreferenciasNavegacao = { pessoal: null, padrao: null, efetiva: null };

/**
 * Preferências de navegação da empresa ativa, lidas uma vez por requisição. O RLS só devolve o
 * padrão da empresa e a linha da própria pessoa. Falha de leitura = sem preferência (menu do
 * registro), nunca um erro na tela.
 */
export const getPreferenciasNavegacao = cache(async (): Promise<PreferenciasNavegacao> => {
  const ativa = await getEmpresaAtiva();
  if (!ativa) return NENHUMA;
  try {
    const { data, error } = await (await createClient())
      .from("menu_preferencias")
      .select("user_id, itens, abas_ocultas")
      .eq("workspace_id", ativa.workspaceId)
      .or(`user_id.is.null,user_id.eq.${ativa.userId}`);
    if (error || !data) return NENHUMA;
    const linhas = data as { user_id: string | null; itens: unknown; abas_ocultas: unknown }[];
    const pessoal = lerPreferencia(linhas.find((l) => l.user_id === ativa.userId) ?? null);
    const padrao = lerPreferencia(linhas.find((l) => l.user_id === null) ?? null);
    return { pessoal, padrao, efetiva: resolverPreferencia(pessoal, padrao) };
  } catch {
    return NENHUMA;
  }
});

/** Abas visíveis de uma tela (módulo ou "visao_geral") para a pessoa; nunca vazia. */
export async function getAbasVisiveis(chave: string): Promise<string[]> {
  return abasVisiveis(chave, (await getPreferenciasNavegacao()).efetiva);
}

export interface ContextoNavegacao {
  workspaceId: string;
  userId: string;
  /** Fundador/cofundador: pode salvar o padrão da empresa. */
  painel: boolean;
  restrito: boolean;
  /** Módulos que a pessoa abre: registro ∩ ligados ∩ (para a equipe) permissão ∩ catálogo. */
  modulosVisiveis: string[];
}

/** O mesmo cálculo do layout: só o que a pessoa já vê entra na personalização. */
export async function getContextoNavegacao(): Promise<ContextoNavegacao | null> {
  const ativa = await getEmpresaAtiva();
  if (!ativa) return null;
  const painel = temPainelCompleto(ativa.papel);
  const restrito = ehPapelRestrito(ativa.papel);
  if (!painel && !restrito) return null;
  const habilitados = await getModulosHabilitados(ativa.workspaceId);
  let visiveis = habilitados;
  if (!painel) {
    const [permissoes, permiteMembros] = await Promise.all([
      lerPermissoesProprias(await createClient(), ativa.workspaceId, ativa.userId),
      getModulosPermiteMembros(),
    ]);
    visiveis = modulosVisiveis(habilitados, modulosDasPermissoes(permissoes), permiteMembros);
  }
  return { workspaceId: ativa.workspaceId, userId: ativa.userId, painel, restrito, modulosVisiveis: visiveis };
}
