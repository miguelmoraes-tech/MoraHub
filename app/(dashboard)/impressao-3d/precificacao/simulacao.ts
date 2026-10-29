"use server";

import { getAcessoModulo } from "@/lib/empresa-ativa";
import { createClient } from "@/lib/supabase/server";
import { mensagemRpc } from "@/lib/impressao-3d/erros";
import { SEM_PERMISSAO, entradaParaRecalculo, podeVerCustos } from "@/lib/impressao-3d/regras";
import { ocultarCustosDoCalculo } from "@/lib/impressao-3d/calculo";

export type ResultadoSimular = { dados: { entrada: unknown; calculo: unknown } } | { error: string };

/**
 * Simula o preço pela RPC p3d_simular_preco (nada é gravado). Leitura no módulo
 * Precificação; dentro de um orçamento, edição em Orçamentos 3D — e sem o extra
 * "custos" a resposta sai sem custo, lucro e margem.
 */
export async function simularPreco(
  entrada: Record<string, unknown>,
  contexto: "precificacao" | "orcamentos"
): Promise<ResultadoSimular> {
  const acesso =
    contexto === "orcamentos"
      ? await getAcessoModulo("p3d_orcamentos", "edicao")
      : await getAcessoModulo("p3d_precificacao");
  if (!acesso) return { error: SEM_PERMISSAO };

  const { data, error } = await (await createClient()).rpc("p3d_simular_preco", {
    p_ws: acesso.workspaceId,
    p_entrada: entrada as never,
  });
  if (error) return { error: mensagemRpc(error, "Não foi possível simular o preço.") };

  const resposta = (data ?? {}) as { entrada?: unknown; calculo?: unknown };
  const ver = contexto === "orcamentos" ? podeVerCustos(acesso) : true;
  return {
    dados: {
      // Os parâmetros efetivos (tarifa, preço do material, margem...) também são custo.
      entrada: ver ? (resposta.entrada ?? {}) : entradaParaRecalculo((resposta.entrada ?? {}) as Record<string, unknown>),
      calculo: ver ? resposta.calculo : ocultarCustosDoCalculo(resposta.calculo),
    },
  };
}
