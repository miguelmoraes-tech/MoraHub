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
  async (workspaceId: string): Promise<string[]> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("workspace_modulos")
      .select("modulo_chave")
      .eq("workspace_id", workspaceId)
      .eq("habilitado", true);
    return (data ?? []).map((r) => r.modulo_chave).filter((c) => !!getModuloRegistro(c));
  }
);

export interface EmpresaDoUsuario {
  /** Empresa própria mais antiga (hoje a "ativa"); null se a conta não tem nenhuma. */
  workspaceId: string | null;
  habilitados: string[];
}

/**
 * Empresa própria do usuário + módulos ligados, numa única consulta (a FK
 * workspace_modulos -> perfis_tipos_ativos permite embutir). Recebe o client
 * como argumento porque o proxy monta o próprio a partir dos cookies da
 * requisição. Falha => sem empresa e sem módulos (nega o acesso, não abre).
 */
export async function getEmpresaDoUsuario(
  supabase: SupabaseClient,
  userId: string
): Promise<EmpresaDoUsuario> {
  const { data } = await supabase
    .from("perfis_tipos_ativos")
    .select("id, workspace_modulos(modulo_chave)")
    .eq("user_id", userId)
    .eq("tipo", "empresarial")
    .eq("workspace_modulos.habilitado", true)
    .order("ativado_em", { ascending: true })
    .limit(1)
    .maybeSingle();

  const row = data as { id: string; workspace_modulos: { modulo_chave: string }[] | null } | null;
  if (!row) return { workspaceId: null, habilitados: [] };
  return {
    workspaceId: row.id,
    habilitados: (row.workspace_modulos ?? [])
      .map((m) => m.modulo_chave)
      .filter((c) => !!getModuloRegistro(c)),
  };
}
