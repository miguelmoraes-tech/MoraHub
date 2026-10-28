import { createClient } from "@/lib/supabase/server";

export interface Responsavel {
  id: string;
  nome: string;
}

/**
 * Quem pode ser responsável por um item do calendário de conteúdo: o fundador
 * e os membros ativos da empresa (RPC pessoas_da_empresa, sem vendedores).
 * Falha na consulta = lista vazia (o campo fica sem opções, nada é aberto).
 */
export async function getResponsaveisMarketing(workspaceId: string): Promise<Responsavel[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("pessoas_da_empresa", {
    p_workspace_id: workspaceId,
  });
  if (error) return [];
  return ((data ?? []) as { pessoa_id: string; nome: string | null; papel: string }[]).map((p) => ({
    id: p.pessoa_id,
    nome: p.nome || "Sem nome",
  }));
}
