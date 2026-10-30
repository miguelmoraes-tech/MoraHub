"use server";

import { revalidatePath } from "next/cache";
import { getAcessoEdicao } from "@/lib/empresa-ativa";
import { createClient } from "@/lib/supabase/server";
import { mensagemEscrita, mensagemRpc } from "@/lib/impressao-3d/erros";
import { SEM_PERMISSAO, SEM_PERMISSAO_CUSTOS, gramasDeRolos, podeVerCustos } from "@/lib/impressao-3d/regras";
import { parseNumero } from "@/lib/impressao-3d/numeros";
import { validarMovimentoPeca } from "@/lib/impressao-3d/pecas";
import { PESO_KG_G, entradaDeCompraKg, entradaDeCompraUnidade } from "@/lib/impressao-3d/filamentos";
import {
  MaterialSchema,
  MovimentoPecaSchema,
  MovimentoSchema,
  PecaEstoqueSchema,
  formParaObjeto,
  primeiroErro,
} from "@/lib/impressao-3d/validacao";
import type { ActionState } from "@/lib/actions/types";

const MODULO = "p3d_estoque";
const ROTA = "/impressao-3d/estoque";

/**
 * Cadastro do material. NUNCA envia estoque_atual, custo_medio nem ultimo_custo
 * (o banco barra): saldo e custo médio só mudam por p3d_movimentar_estoque.
 * custo_cadastro é coluna gerada. O valor pago é custo: só com o extra "custos".
 *
 * Filamento (unidade g): grava o VALOR DO KG em preco_compra e o peso do rolo como 1000 g (assim
 * custo_cadastro = valor do kg ÷ 1000 por g). O peso do rolo enviado pelo cliente é ignorado.
 * "Quanto comprei" (kg ou g; 0 = só cadastra) dá a entrada de estoque com custo_total = kg × valor do kg.
 */
export async function criarMaterial(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = MaterialSchema.safeParse(formParaObjeto(formData));
  if (!parsed.success) return { error: primeiroErro(parsed.error) };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { preco_compra, peso_liquido_rolo_g: _pesoDoCliente, ...resto } = parsed.data;
  const porPeso = resto.unidade === "g";

  const comprei = parseNumero(formData.get("quanto_comprei"));
  if (comprei !== null && (Number.isNaN(comprei) || comprei < 0)) {
    return { error: "Quanto comprei: informe um número válido (zero ou maior)." };
  }
  const verCustos = podeVerCustos(acesso);
  const unidadeCompra = formData.get("unidade_compra") === "g" ? "g" : "kg";
  const entrada = porPeso
    ? entradaDeCompraKg({ quantidade: comprei ?? 0, unidade: unidadeCompra, valorKg: verCustos ? preco_compra : null })
    : entradaDeCompraUnidade({ quantidade: comprei ?? 0, precoUnitario: verCustos ? preco_compra : null });

  const supabase = await createClient();
  const { data: criado, error } = await supabase
    .from("p3d_materiais")
    .insert({
      workspace_id: acesso.workspaceId,
      ...resto,
      ...(porPeso ? { peso_liquido_rolo_g: PESO_KG_G } : {}),
      ...(verCustos ? { preco_compra } : {}),
    })
    .select("id")
    .single();
  if (error || !criado) return { error: mensagemEscrita(error, "Não foi possível salvar o material.") };

  if (entrada) {
    const { error: erroEntrada } = await supabase.rpc("p3d_movimentar_estoque", {
      p_ws: acesso.workspaceId,
      p_material_id: criado.id,
      p_tipo: "entrada",
      p_quantidade: entrada.quantidade,
      ...(entrada.custoTotal !== null ? { p_custo_total: entrada.custoTotal } : {}),
      p_observacao: "Compra registrada no cadastro",
    });
    if (erroEntrada) {
      revalidatePath(ROTA);
      return {
        error: `Material cadastrado, mas a entrada de estoque falhou: ${mensagemRpc(erroEntrada, "tente dar a entrada pelo botão Nova compra.")}`,
      };
    }
  }

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { preco_compra, peso_liquido_rolo_g: _pesoDoCliente, ...resto } = parsed.data;
  const verCustos = podeVerCustos(acesso);
  const supabase = await createClient();
  const { error } = await supabase
    .from("p3d_materiais")
    .update({
      ...resto,
      // Sem o extra, preço e peso do rolo gravados não são tocados (a tela nem mostra o campo).
      ...(verCustos ? { preco_compra, ...(resto.unidade === "g" ? { peso_liquido_rolo_g: PESO_KG_G } : {}) } : {}),
    })
    .eq("id", materialId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: mensagemEscrita(error, "Não foi possível atualizar o material.") };

  revalidatePath(ROTA);
  return { ok: true };
}

/**
 * Nova compra de um filamento já cadastrado: nova ENTRADA de estoque com o valor pago (kg × valor do
 * kg), que atualiza o custo médio. Não altera o preço de cadastro.
 */
export async function registrarCompraMaterial(
  materialId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const quantidade = parseNumero(formData.get("quantidade"));
  if (quantidade === null || Number.isNaN(quantidade) || quantidade <= 0) {
    return { error: "Quanto comprei: informe um valor maior que zero." };
  }
  const valor = parseNumero(formData.get("valor_pago"));
  if (valor !== null && (Number.isNaN(valor) || valor < 0)) {
    return { error: "Valor pago: informe um número válido (zero ou maior)." };
  }
  const verCustos = podeVerCustos(acesso);
  if (valor !== null && valor > 0 && !verCustos) return { error: SEM_PERMISSAO_CUSTOS };

  const supabase = await createClient();
  const { data: material } = await supabase
    .from("p3d_materiais")
    .select("unidade")
    .eq("id", materialId)
    .eq("workspace_id", acesso.workspaceId)
    .maybeSingle();
  if (!material) return { error: "Material não encontrado." };

  const unidadeCompra = formData.get("unidade_compra") === "g" ? "g" : "kg";
  const entrada =
    material.unidade === "g"
      ? entradaDeCompraKg({ quantidade, unidade: unidadeCompra, valorKg: valor })
      : entradaDeCompraUnidade({ quantidade, precoUnitario: valor });
  if (!entrada) return { error: "Quanto comprei: informe um valor maior que zero." };

  const { error } = await supabase.rpc("p3d_movimentar_estoque", {
    p_ws: acesso.workspaceId,
    p_material_id: materialId,
    p_tipo: "entrada",
    p_quantidade: entrada.quantidade,
    ...(entrada.custoTotal !== null ? { p_custo_total: entrada.custoTotal } : {}),
    p_observacao: "Nova compra",
  });
  if (error) return { error: mensagemRpc(error, "Não foi possível registrar a compra.") };

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

// --- Estoque de peças (peças impressas prontas) -------------------------------------------------
// Mesmo módulo e mesmas permissões do estoque de material. Insert/update direto SÓ de produto,
// variação, mínimo e localização; quantidade e custo médio só por p3d_movimentar_pecas (entrada
// manual, devolução, perda e ajuste). Produção e venda são das telas de Produção e de Pedidos.

/** "Nova peça no estoque": cria a linha (produto + variação) e, se informado, dá a primeira entrada. */
export async function criarPecaEstoque(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = PecaEstoqueSchema.safeParse(formParaObjeto(formData));
  if (!parsed.success) return { error: primeiroErro(parsed.error) };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const inicial = parseNumero(formData.get("quantidade_inicial"));
  const custo = parseNumero(formData.get("custo_unitario"));
  if (inicial !== null && (Number.isNaN(inicial) || !Number.isInteger(inicial) || inicial < 0)) {
    return { error: "Quantidade inicial: informe um número inteiro (zero ou maior)." };
  }
  if (custo !== null && (Number.isNaN(custo) || custo < 0)) {
    return { error: "Custo por peça: informe um número válido (zero ou maior)." };
  }
  const verCustos = podeVerCustos(acesso);
  if (custo !== null && custo > 0 && !verCustos) return { error: SEM_PERMISSAO_CUSTOS };

  const supabase = await createClient();
  const { error } = await supabase
    .from("p3d_pecas_estoque")
    .insert({ workspace_id: acesso.workspaceId, ...parsed.data });
  if (error) return { error: mensagemEscrita(error, "Não foi possível salvar a peça no estoque.") };

  if (inicial && inicial > 0) {
    const { error: erroEntrada } = await supabase.rpc("p3d_movimentar_pecas", {
      p_ws: acesso.workspaceId,
      p_produto_id: parsed.data.produto_id,
      p_variacao_id: parsed.data.variacao_id as never,
      p_tipo: "entrada_manual",
      p_quantidade: inicial,
      ...(custo !== null && custo > 0 ? { p_custo_unitario: custo } : {}),
      p_observacao: "Saldo inicial",
    });
    if (erroEntrada) {
      revalidatePath(ROTA);
      return {
        error: `Peça cadastrada, mas a entrada falhou: ${mensagemRpc(erroEntrada, "tente pelo botão Entrada manual.")}`,
      };
    }
  }

  revalidatePath(ROTA);
  return { ok: true };
}

/** Só mínimo e localização mudam por update direto (produto e variação definem a linha). */
export async function atualizarPecaEstoque(
  pecaId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = PecaEstoqueSchema.pick({ estoque_minimo: true, localizacao: true }).safeParse(formParaObjeto(formData));
  if (!parsed.success) return { error: primeiroErro(parsed.error) };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const { error } = await (await createClient())
    .from("p3d_pecas_estoque")
    .update({ estoque_minimo: parsed.data.estoque_minimo, localizacao: parsed.data.localizacao })
    .eq("id", pecaId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: mensagemEscrita(error, "Não foi possível atualizar a peça.") };

  revalidatePath(ROTA);
  return { ok: true };
}

/** Só item sem saldo e sem histórico pode ser excluído (o banco recusa os demais). */
export async function excluirPecaEstoque(pecaId: string): Promise<ActionState> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const { error } = await (await createClient())
    .from("p3d_pecas_estoque")
    .delete()
    .eq("id", pecaId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) {
    return { error: mensagemEscrita(error, "Não foi possível excluir. Peça com saldo ou histórico não pode ser excluída.") };
  }

  revalidatePath(ROTA);
  return { ok: true };
}

/** Entrada manual, devolução, perda (quantidade positiva) e ajuste (com sinal, observação obrigatória). */
export async function movimentarPecas(
  pecaId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = MovimentoPecaSchema.safeParse(formParaObjeto(formData));
  if (!parsed.success) return { error: primeiroErro(parsed.error) };
  const valido = validarMovimentoPeca(parsed.data.tipo, parsed.data.quantidade, parsed.data.observacao);
  if ("error" in valido) return valido;

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };
  // Custo da peça é dado de custo: só com o extra "custos".
  const { custo_unitario, observacao, tipo } = parsed.data;
  if (custo_unitario !== null && custo_unitario > 0 && !podeVerCustos(acesso)) return { error: SEM_PERMISSAO_CUSTOS };

  const supabase = await createClient();
  const { data: peca } = await supabase
    .from("p3d_pecas_estoque")
    .select("produto_id, variacao_id")
    .eq("id", pecaId)
    .eq("workspace_id", acesso.workspaceId)
    .maybeSingle();
  if (!peca) return { error: "Peça não encontrada no estoque." };

  const { error } = await supabase.rpc("p3d_movimentar_pecas", {
    p_ws: acesso.workspaceId,
    p_produto_id: peca.produto_id,
    p_variacao_id: peca.variacao_id as never,
    p_tipo: tipo,
    p_quantidade: valido.quantidade,
    ...((tipo === "entrada_manual" || tipo === "devolucao") && custo_unitario !== null && custo_unitario > 0
      ? { p_custo_unitario: custo_unitario }
      : {}),
    ...(observacao ? { p_observacao: observacao } : {}),
  });
  if (error) return { error: mensagemRpc(error, "Não foi possível registrar o movimento.") };

  revalidatePath(ROTA);
  return { ok: true };
}

export type ResultadoProdutoRapido = { id: string } | { error: string };

/** "Criar produto rápido": só o nome, para quem pode editar Produtos. */
export async function criarProdutoRapido(nome: string): Promise<ResultadoProdutoRapido> {
  const limpo = typeof nome === "string" ? nome.trim() : "";
  if (!limpo) return { error: "Nome do produto: campo obrigatório." };
  if (limpo.length > 160) return { error: "Nome do produto: use no máximo 160 caracteres." };

  const acesso = await getAcessoEdicao("p3d_produtos");
  if (!acesso) return { error: SEM_PERMISSAO };

  const { data, error } = await (await createClient())
    .from("p3d_produtos")
    .insert({ workspace_id: acesso.workspaceId, nome: limpo })
    .select("id")
    .single();
  if (error || !data) return { error: mensagemEscrita(error, "Não foi possível criar o produto.") };

  revalidatePath(ROTA);
  revalidatePath("/impressao-3d/produtos");
  return { id: data.id };
}
