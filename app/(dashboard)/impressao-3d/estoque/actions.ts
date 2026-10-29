"use server";

import { revalidatePath } from "next/cache";
import { getAcessoEdicao } from "@/lib/empresa-ativa";
import { createClient } from "@/lib/supabase/server";
import { mensagemEscrita, mensagemRpc } from "@/lib/impressao-3d/erros";
import { SEM_PERMISSAO, SEM_PERMISSAO_CUSTOS, gramasDeRolos, podeVerCustos } from "@/lib/impressao-3d/regras";
import { parseNumero } from "@/lib/impressao-3d/numeros";
import {
  MaterialSchema,
  MovimentoSchema,
  formParaObjeto,
  primeiroErro,
} from "@/lib/impressao-3d/validacao";
import type { ActionState } from "@/lib/actions/types";

const MODULO = "p3d_estoque";
const ROTA = "/impressao-3d/estoque";

/**
 * Cadastro do material. NUNCA envia estoque_atual, custo_medio nem ultimo_custo
 * (o banco barra): saldo e custo médio só mudam por p3d_movimentar_estoque.
 * custo_cadastro é coluna gerada. O preço de compra é custo: só com o extra "custos".
 */
export async function criarMaterial(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = MaterialSchema.safeParse(formParaObjeto(formData));
  if (!parsed.success) return { error: primeiroErro(parsed.error) };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const { preco_compra, ...resto } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("p3d_materiais").insert({
    workspace_id: acesso.workspaceId,
    ...resto,
    ...(podeVerCustos(acesso) ? { preco_compra } : {}),
  });
  if (error) return { error: mensagemEscrita(error, "Não foi possível salvar o material.") };

  revalidatePath(ROTA);
  return { ok: true };
}

export async function atualizarMaterial(
  materialId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = MaterialSchema.safeParse(formParaObjeto(formData));
  if (!parsed.success) return { error: primeiroErro(parsed.error) };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const { preco_compra, ...resto } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("p3d_materiais")
    .update({
      ...resto,
      // Sem o extra, o preço gravado não é tocado (a tela nem mostra o campo).
      ...(podeVerCustos(acesso) ? { preco_compra } : {}),
    })
    .eq("id", materialId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: mensagemEscrita(error, "Não foi possível atualizar o material.") };

  revalidatePath(ROTA);
  return { ok: true };
}

export async function alternarMaterialAtivo(materialId: string, ativo: boolean): Promise<ActionState> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase
    .from("p3d_materiais")
    .update({ ativo })
    .eq("id", materialId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: mensagemEscrita(error, "Não foi possível alterar o material.") };

  revalidatePath(ROTA);
  return { ok: true };
}

/** Só materiais sem histórico podem ser excluídos; os demais devem ser arquivados. */
export async function excluirMaterial(materialId: string): Promise<ActionState> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase
    .from("p3d_materiais")
    .delete()
    .eq("id", materialId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) {
    return {
      error: mensagemEscrita(
        error,
        "Não foi possível excluir o material. Se ele tem movimentos ou está em produtos, arquive."
      ),
    };
  }

  revalidatePath(ROTA);
  return { ok: true };
}

/**
 * Entrada, ajuste ou perda de estoque, sempre pela RPC p3d_movimentar_estoque
 * (mantém saldo, custo médio e histórico). O texto de erro da RPC é mostrado
 * como veio. Entrada por rolos: o servidor multiplica rolos × peso líquido do
 * cadastro, em gramas.
 */
export async function movimentarEstoque(
  materialId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const bruto: Record<string, unknown> = { ...formParaObjeto(formData), material_id: materialId };
  const rolos = parseNumero(bruto.rolos);
  if (rolos !== null && !(rolos > 0)) return { error: "Rolos: informe um número maior que zero." };
  // Com rolos informados a quantidade vem do cadastro; senão do campo "quantidade".
  const parsed = MovimentoSchema.safeParse(rolos ? { ...bruto, quantidade: "1" } : bruto);
  if (!parsed.success) return { error: primeiroErro(parsed.error) };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };
  const { tipo, observacao, custo_total } = parsed.data;
  let quantidade = parsed.data.quantidade;

  const supabase = await createClient();
  if (rolos) {
    if (tipo !== "entrada") return { error: "Rolos só valem para entrada." };
    const { data: material } = await supabase
      .from("p3d_materiais")
      .select("peso_liquido_rolo_g")
      .eq("id", materialId)
      .eq("workspace_id", acesso.workspaceId)
      .maybeSingle();
    const peso = Number(material?.peso_liquido_rolo_g);
    if (!(peso > 0)) return { error: "Cadastre o peso líquido do rolo no material para dar entrada por rolos." };
    quantidade = gramasDeRolos(rolos, peso);
  }

  if (tipo !== "ajuste" && quantidade <= 0) {
    return { error: "Quantidade: informe um valor maior que zero." };
  }
  if (tipo === "ajuste" && !observacao) {
    return { error: "O ajuste exige uma observação explicando o motivo." };
  }
  // Custo da entrada é dado de custo: só com o extra "custos".
  if (custo_total !== null && !podeVerCustos(acesso)) return { error: SEM_PERMISSAO_CUSTOS };

  const { error } = await supabase.rpc("p3d_movimentar_estoque", {
    p_ws: acesso.workspaceId,
    p_material_id: materialId,
    p_tipo: tipo,
    p_quantidade: quantidade,
    ...(tipo === "entrada" && custo_total !== null ? { p_custo_total: custo_total } : {}),
    ...(observacao ? { p_observacao: observacao } : {}),
  });
  if (error) return { error: mensagemRpc(error, "Não foi possível registrar o movimento.") };

  revalidatePath(ROTA);
  return { ok: true };
}
