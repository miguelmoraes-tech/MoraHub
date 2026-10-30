import { createClient } from "@/lib/supabase/server";
import { lerPessoasCompradoras, type PessoaComprador } from "@/lib/impressao-3d/comprador";

/**
 * Pessoas da empresa ativa para o seletor "Quem comprou" (RPC pessoas_da_empresa: fundador, cofundador,
 * sócios e funcionários; vendedor fica de fora). Falha na consulta = lista vazia: o seletor só oferece
 * "Outra pessoa" e "Não informado", nada é aberto.
 */
export async function getPessoasCompradoras(workspaceId: string): Promise<PessoaComprador[]> {
  const { data, error } = await (await createClient()).rpc("pessoas_da_empresa", { p_workspace_id: workspaceId });
  if (error) return [];
  return lerPessoasCompradoras(data);
}
