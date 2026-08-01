import { createClient } from "@/lib/supabase/server";
import type { ColaboradorParaAtribuicao } from "@/lib/types";

export interface Responsavel {
  id: string;
  nome: string;
}

/**
 * Quem pode ser responsável por um item do calendário de conteúdo: o dono
 * da conta e qualquer colaborador com papel 'marketing' ativo nela.
 */
export async function getResponsaveisMarketing(donoId: string): Promise<Responsavel[]> {
  const supabase = await createClient();

  const [{ data: perfilDono }, { data: colaboradores }] = (await Promise.all([
    supabase.from("perfis").select("id, nome").eq("id", donoId).maybeSingle(),
    supabase.rpc("get_colaboradores_do_dono_by_id", { p_dono_id: donoId }),
  ])) as [
    { data: { id: string; nome: string | null } | null },
    { data: ColaboradorParaAtribuicao[] | null },
  ];

  const responsaveis: Responsavel[] = [];
  if (perfilDono) {
    responsaveis.push({ id: perfilDono.id, nome: perfilDono.nome || "Você (dono)" });
  }
  for (const c of colaboradores ?? []) {
    if (c.papel !== "marketing" || c.status !== "ativo") continue;
    responsaveis.push({ id: c.membro_id, nome: c.nome || c.email || "Colaborador" });
  }
  return responsaveis;
}
