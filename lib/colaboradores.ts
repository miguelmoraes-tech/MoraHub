import type { SupabaseClient } from "@supabase/supabase-js";
import type { ColaboradorVinculado } from "@/lib/types";

/**
 * Colaboradores de UMA empresa. A RPC get_colaboradores_do_dono devolve os de
 * todas as empresas do dono (não recebe workspace), então o resultado é
 * cruzado com as linhas de `membros` daquela empresa. Quando existir uma
 * função com workspace no banco (get_colaboradores_da_empresa), é só trocar
 * aqui — os chamadores não mudam.
 */
export async function getColaboradoresDaEmpresa(
  supabase: SupabaseClient,
  workspaceId: string | null
): Promise<ColaboradorVinculado[]> {
  if (!workspaceId) return [];
  const [{ data: todos }, { data: membros }] = await Promise.all([
    supabase.rpc("get_colaboradores_do_dono"),
    supabase.from("membros").select("id").eq("workspace_id", workspaceId),
  ]);
  const ids = new Set(((membros ?? []) as { id: string }[]).map((m) => m.id));
  return ((todos ?? []) as ColaboradorVinculado[]).filter((c) => ids.has(c.id));
}
