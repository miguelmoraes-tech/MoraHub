import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { lerAprovacoes, listarFundadores, type Aprovacao, type Fundador } from "@/lib/aprovacoes-shared";

export { exigeAprovacao, listarFundadores } from "@/lib/aprovacoes-shared";

/**
 * Leituras de aprovações no servidor. Quem decide a regra é o banco: com 2+
 * fundadores as funções administrativas só criam um pedido em `aprovacoes`.
 * Como as funções void não sinalizam isso, a tela consulta ANTES quantos
 * fundadores há (fundadores_da_empresa) e age conforme o caso.
 */

export const getFundadores = cache(async (workspaceId: string): Promise<Fundador[]> => {
  return (await listarFundadores(await createClient(), workspaceId)) ?? [];
});

/** Pedidos da empresa (só fundadores leem). Falha = lista vazia. */
export const getAprovacoes = cache(async (workspaceId: string): Promise<Aprovacao[]> => {
  try {
    const { data, error } = await (await createClient()).rpc("listar_aprovacoes", {
      p_workspace_id: workspaceId,
    });
    return error ? [] : lerAprovacoes(data);
  } catch {
    return [];
  }
});
