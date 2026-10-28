import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getEmpresaAtiva } from "@/lib/empresa-ativa";
import { criarRotulos, lerMapaRotulos, type MapaRotulos, type Rotulos } from "@/lib/rotulos-shared";

/**
 * Configuração de nicho/modelo/rótulos da empresa ativa (workspace_config).
 * A RLS deixa ler ao dono/cofundador e aos membros da empresa, então sócios e
 * funcionários também veem os rótulos. Empresa sem linha (as atuais) ou falha
 * de leitura = sem rótulo nenhum: o app mostra os textos de sempre.
 */
export interface ConfigEmpresa {
  nichoChave: string | null;
  modeloId: string | null;
  mapa: MapaRotulos;
}

const VAZIA: ConfigEmpresa = { nichoChave: null, modeloId: null, mapa: {} };

export const getConfigEmpresa = cache(async (): Promise<ConfigEmpresa> => {
  try {
    const ativa = await getEmpresaAtiva();
    if (!ativa) return VAZIA;
    const { data, error } = await (await createClient())
      .from("workspace_config")
      .select("nicho_chave, modelo_id, config")
      .eq("workspace_id", ativa.workspaceId)
      .maybeSingle();
    if (error || !data) return VAZIA;
    return {
      nichoChave: data.nicho_chave ?? null,
      modeloId: data.modelo_id ?? null,
      mapa: lerMapaRotulos(data.config),
    };
  } catch {
    return VAZIA;
  }
});

/** Rótulos da empresa ativa, para páginas e layouts de servidor. */
export async function getRotulos(): Promise<Rotulos> {
  return criarRotulos((await getConfigEmpresa()).mapa);
}
