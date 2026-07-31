import { createClient } from "@/lib/supabase/server";
import type { Cliente, ContaVinculada } from "@/lib/types";

export {
  filtrarContasPorPapel,
  nomeConta,
  type ClienteVinculado,
} from "@/lib/colaborador-shared";

/** All owner accounts (any papel) the current user collaborates on. */
export async function getContasVinculadas(): Promise<ContaVinculada[]> {
  const supabase = await createClient();
  const { data } = (await supabase.rpc("get_contas_vinculadas")) as {
    data: ContaVinculada[] | null;
  };
  return data ?? [];
}

/**
 * All `clientes` rows belonging to any of the given owner accounts —
 * scoped by RLS ("colaborador vinculado ve clientes") to donos where the
 * caller is an active member, so a stray id here simply returns nothing.
 */
export async function getClientesVinculados(
  donoIds: string[]
): Promise<Cliente[]> {
  if (donoIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = (await supabase
    .from("clientes")
    .select("*")
    .in("user_id", donoIds)
    .order("nome")) as { data: Cliente[] | null };
  return data ?? [];
}
