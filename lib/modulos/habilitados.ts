import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getModuloRegistro } from "@/lib/modulos/registry";

/**
 * Módulos ligados de uma empresa, no servidor. A fonte é `workspace_modulos`
 * (RLS: só dono e membros da empresa leem). Chaves que o registro não conhece
 * são descartadas: sem código para atendê-las, não têm rota nem menu.
 */
export const getModulosHabilitados = cache(
  async (workspaceId: string): Promise<string[]> =>
    getModulosDaEmpresa(await createClient(), workspaceId)
);

/**
 * A mesma leitura com o client por argumento: o proxy monta o próprio client a
 * partir dos cookies da requisição. É a ÚNICA consulta de módulos por request.
 * Falha de leitura = nenhum módulo (nega o acesso, não abre).
 */
export async function getModulosDaEmpresa(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<string[]> {
  const { data } = await supabase
    .from("workspace_modulos")
    .select("modulo_chave")
    .eq("workspace_id", workspaceId)
    .eq("habilitado", true);
  return ((data ?? []) as { modulo_chave: string }[])
    .map((r) => r.modulo_chave)
    .filter((c) => !!getModuloRegistro(c));
}
