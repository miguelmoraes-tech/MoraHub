"use server";

import { revalidatePath } from "next/cache";
import { getAcessoEdicao, getAcessoModulo } from "@/lib/empresa-ativa";
import { createClient } from "@/lib/supabase/server";
import { mensagemEscrita, mensagemRpc } from "@/lib/impressao-3d/erros";
import { SEM_PERMISSAO, SEM_PERMISSAO_CUSTOS, gramasDeRolos, podeVerCustos } from "@/lib/impressao-3d/regras";
import { parseNumero } from "@/lib/impressao-3d/numeros";
import { validarMovimentoPeca } from "@/lib/impressao-3d/pecas";
import { lerCompra, lerComprador } from "@/lib/impressao-3d/comprador";
import { AJUSTE_KIT_ACABOU, OBSERVACAO_KIT_ACABOU, validarKit } from "@/lib/impressao-3d/estoque-uso";
import {
  MOTIVO_PADRAO, ajustesDaConferencia, diferencaContagem, lerContagem, motivoValido, observacaoConferencia,
  observacaoDoAjuste, precisaAjustar,
} from "@/lib/impressao-3d/ajuste-estoque";
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

/** Só envia o que foi informado: o banco assume hoje e "sem comprador" para o que faltar. */
function paramsComprador(c: { comprador_user_id: string | null; comprador_nome: string | null }, data: string | null) {
  return {
    ...(c.comprador_user_id ? { p_comprador_user_id: c.comprador_user_id } : {}),
    ...(c.comprador_nome ? { p_comprador_nome: c.comprador_nome } : {}),
    ...(data ? { p_data_compra: data } : {}),
  };
}

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
  const { preco_compra, peso_liquido_rolo_g: _pesoDoCliente, ...dados } = parsed.data;
  // Kit/conjunto: só existe em unidade "un" (o banco recusa outra); o preço pago é o valor do kit.
  const kit = validarKit({ kit: formData.get("kit"), kitItens: formData.get("kit_itens") });
  if ("error" in kit) return { error: kit.error };
  const resto = { ...dados, ...(kit.kit ? { unidade: "un" as const } : {}), kit: kit.kit, kit_itens: kit.kit_itens };
  const porPeso = resto.unidade === "g";

  const comprei = parseNumero(formData.get("quanto_comprei"));
  if (comprei !== null && (Number.isNaN(comprei) || comprei < 0)) {
    return { error: "Quanto comprei: informe um número válido (zero ou maior)." };
  }
  // Quem comprou e a data só valem se houver entrada; valida antes de criar o material.
  const compra = lerCompra((c) => formData.get(c));
  if ("error" in compra) return { error: compra.error };
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
    const { error: erroEntrada } = await supabase.rpc("p3d_registrar_entrada_material", {
      p_ws: acesso.workspaceId,
      p_material_id: criado.id,
      p_quantidade: entrada.quantidade,
      ...(entrada.custoTotal !== null ? { p_custo_total: entrada.custoTotal } : {}),
      ...paramsComprador(compra.comprador, compra.data),
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
  const { preco_compra, peso_liquido_rolo_g: _pesoDoCliente, ...dados } = parsed.data;
  const kit = validarKit({ kit: formData.get("kit"), kitItens: formData.get("kit_itens") });
  if ("error" in kit) return { error: kit.error };
  const resto = { ...dados, ...(kit.kit ? { unidade: "un" as const } : {}), kit: kit.kit, kit_itens: kit.kit_itens };
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
  const compra = lerCompra((c) => formData.get(c));
  if ("error" in compra) return { error: compra.error };

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

  const { error } = await supabase.rpc("p3d_registrar_entrada_material", {
    p_ws: acesso.workspaceId,
    p_material_id: materialId,
    p_quantidade: entrada.quantidade,
    ...(entrada.custoTotal !== null ? { p_custo_total: entrada.custoTotal } : {}),
    ...paramsComprador(compra.comprador, compra.data),
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
 * Entrada (compra: p3d_registrar_entrada_material, com quem comprou e a data), ajuste ou perda (p3d_movimentar_estoque)
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

  // ENTRADA é compra: vai por p3d_registrar_entrada_material (com quem comprou e a data). Ajuste e perda
  // seguem por p3d_movimentar_estoque.
  if (tipo === "entrada") {
    const compra = lerCompra((c) => formData.get(c));
    if ("error" in compra) return { error: compra.error };
    const { error } = await supabase.rpc("p3d_registrar_entrada_material", {
      p_ws: acesso.workspaceId,
      p_material_id: materialId,
      p_quantidade: quantidade,
      ...(custo_total !== null ? { p_custo_total: custo_total } : {}),
      ...paramsComprador(compra.comprador, compra.data),
      ...(observacao ? { p_observacao: observacao } : {}),
    });
    if (error) return { error: mensagemRpc(error, "Não foi possível registrar a entrada.") };
    revalidatePath(ROTA);
    return { ok: true };
  }

  const { error } = await supabase.rpc("p3d_movimentar_estoque", {
    p_ws: acesso.workspaceId,
    p_material_id: materialId,
    p_tipo: tipo,
    p_quantidade: quantidade,
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

/**
 * Corrige quem comprou uma ENTRADA já registrada (p3d_corrigir_comprador, tipo "movimento"). Exige edição
 * em Estoque; o banco confere de novo. Sem comprador (seletor vazio) limpa o campo.
 */
export async function corrigirCompradorMovimento(
  movimentoId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const c = lerComprador((campo) => formData.get(campo));
  if ("error" in c) return { error: c.error };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const { error } = await (await createClient()).rpc("p3d_corrigir_comprador", {
    p_tipo: "movimento",
    p_id: movimentoId,
    ...(c.comprador.comprador_user_id ? { p_comprador_user_id: c.comprador.comprador_user_id } : {}),
    ...(c.comprador.comprador_nome ? { p_comprador_nome: c.comprador.comprador_nome } : {}),
  });
  if (error) return { error: mensagemRpc(error, "Não foi possível corrigir o comprador.") };

  revalidatePath(ROTA);
  return { ok: true };
}

// --- Atualizar quantidade / Conferir estoque (ajuste com sinal, sempre pela RPC) -----------------------

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ITENS_CONFERENCIA = 500;

/**
 * Depois de mexer no saldo, pede ao banco que reavalie os alertas (estoque mínimo). É melhor-esforço:
 * só quem tem Automações ou Dashboard pode chamar p3d_atualizar_alertas, e uma falha aqui não desfaz o
 * ajuste (o sino também reavalia sozinho ao abrir).
 */
async function reavaliarAlertas(workspaceId: string) {
  const [automacoes, dashboard] = await Promise.all([getAcessoModulo("p3d_automacoes"), getAcessoModulo("p3d_dashboard")]);
  if (!automacoes && !dashboard) return;
  await (await createClient()).rpc("p3d_atualizar_alertas", { p_ws: workspaceId });
}

/**
 * "Atualizar quantidade": a pessoa diz quanto tem AGORA; a diferença com o saldo do banco (com sinal)
 * vira um ajuste em p3d_movimentar_estoque. Diferença zero não chama nada. O motivo vem de uma lista
 * curta e a observação é opcional. Nunca grava estoque_atual.
 */
export async function atualizarQuantidade(
  materialId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const lida = lerContagem(formData.get("quantidade_nova"));
  if ("error" in lida) return { error: lida.error };
  if (lida.contagem === null) return { error: "Quanto tem agora: campo obrigatório." };
  const motivoBruto = formData.get("motivo");
  const motivo = motivoValido(motivoBruto) ? motivoBruto : MOTIVO_PADRAO;

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { data: material } = await supabase
    .from("p3d_materiais")
    .select("estoque_atual")
    .eq("id", materialId)
    .eq("workspace_id", acesso.workspaceId)
    .maybeSingle();
  if (!material) return { error: "Material não encontrado." };

  const diferenca = diferencaContagem(Number(material.estoque_atual), lida.contagem);
  if (!precisaAjustar(diferenca)) return { ok: true }; // nada a ajustar: não chama o banco

  const { error } = await supabase.rpc("p3d_movimentar_estoque", {
    p_ws: acesso.workspaceId,
    p_material_id: materialId,
    p_tipo: "ajuste",
    p_quantidade: diferenca,
    p_observacao: observacaoDoAjuste(motivo, formData.get("observacao")),
  });
  if (error) return { error: mensagemRpc(error, "Não foi possível atualizar a quantidade.") };

  await reavaliarAlertas(acesso.workspaceId);
  revalidatePath(ROTA);
  return { ok: true };
}

/**
 * "Conferir estoque": uma linha por material (campos q:<id> = "Quanto tem agora?"). Gera um ajuste só
 * para as linhas que mudaram, todas com a observação "Conferência de estoque em <data>". Linha vazia ou
 * igual ao saldo é ignorada. Se um ajuste falhar, os anteriores já valeram: a mensagem diz quantos.
 */
export async function conferirEstoque(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ids: string[] = [];
  const textos = new Map<string, unknown>();
  for (const [chave, valor] of formData.entries()) {
    if (!chave.startsWith("q:")) continue;
    const id = chave.slice(2);
    if (!UUID.test(id)) continue;
    ids.push(id);
    textos.set(id, valor);
  }
  // Partes de kit que acabaram (ou voltaram) na conferência: parte:<id> = "0" (acabou) ou "1" (tem).
  const partes: { id: string; disponivel: boolean }[] = [];
  for (const [chave, valor] of formData.entries()) {
    if (!chave.startsWith("parte:")) continue;
    const id = chave.slice(6);
    if (UUID.test(id) && (valor === "0" || valor === "1")) partes.push({ id, disponivel: valor === "1" });
  }
  if (ids.length === 0 && partes.length === 0) return { error: "Nenhum item para conferir." };
  if (ids.length > MAX_ITENS_CONFERENCIA) return { error: `Confira no máximo ${MAX_ITENS_CONFERENCIA} itens por vez.` };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { data: materiais, error: erroLeitura } = await supabase
    .from("p3d_materiais")
    .select("id, nome, estoque_atual")
    .eq("workspace_id", acesso.workspaceId)
    .in("id", ids);
  if (erroLeitura) return { error: mensagemEscrita(erroLeitura, "Não foi possível ler o estoque.") };
  const porId = new Map((materiais ?? []).map((m) => [m.id, m]));

  const calculo = ajustesDaConferencia(
    ids.filter((id) => porId.has(id)).map((id) => ({ id, saldo: Number(porId.get(id)!.estoque_atual), contagem: textos.get(id) }))
  );
  if ("error" in calculo) return { error: `${porId.get(calculo.id)?.nome ?? "Item"}: ${calculo.error}` };
  if (calculo.ajustes.length === 0 && partes.length === 0) return { ok: true }; // ninguém mudou: nenhuma chamada

  const observacao = observacaoConferencia();
  let feitos = 0;
  for (const a of calculo.ajustes) {
    const { error } = await supabase.rpc("p3d_movimentar_estoque", {
      p_ws: acesso.workspaceId,
      p_material_id: a.id,
      p_tipo: "ajuste",
      p_quantidade: a.diferenca,
      p_observacao: observacao,
    });
    if (error) {
      revalidatePath(ROTA);
      const antes = feitos > 0 ? `${feitos} ajuste(s) feito(s); ` : "";
      return { error: `${antes}falhou em "${porId.get(a.id)?.nome ?? "item"}": ${mensagemRpc(error, "não foi possível ajustar.")}` };
    }
    feitos++;
  }

  // Partes de kit: update direto (edição em Estoque); o banco preenche/limpa acabou_em.
  for (const parte of partes) {
    const { error } = await supabase
      .from("p3d_material_partes")
      .update({ disponivel: parte.disponivel })
      .eq("id", parte.id)
      .eq("workspace_id", acesso.workspaceId);
    if (error) {
      revalidatePath(ROTA);
      return { error: `${feitos} ajuste(s) feito(s); falhou ao marcar parte do kit: ${mensagemEscrita(error, "tente de novo.")}` };
    }
  }

  await reavaliarAlertas(acesso.workspaceId);
  revalidatePath(ROTA);
  return { ok: true };
}

// --- Kits: partes (cores) ---------------------------------------------------------------------------

const COR_HEX = /^#[0-9A-Fa-f]{6}$/;

/** Adiciona ou edita uma parte do kit (nome, cor, observação). O banco recusa parte de item que não é kit. */
export async function salvarParte(
  materialId: string,
  parteId: string | null,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const nome = String(formData.get("nome") ?? "").trim().replace(/\s+/g, " ");
  if (!nome) return { error: "Nome da cor: campo obrigatório." };
  if (nome.length > 80) return { error: "Nome da cor: use no máximo 80 caracteres." };
  const corBruta = String(formData.get("cor_hex") ?? "").trim();
  if (corBruta && !COR_HEX.test(corBruta)) return { error: "Cor: use o formato #RRGGBB." };
  const observacao = String(formData.get("observacao") ?? "").trim();
  if (observacao.length > 300) return { error: "Observação: use no máximo 300 caracteres." };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const dados = { nome, cor_hex: corBruta || null, observacao: observacao || null };
  const supabase = await createClient();
  const { error } = parteId
    ? await supabase.from("p3d_material_partes").update(dados).eq("id", parteId).eq("workspace_id", acesso.workspaceId)
    : await supabase.from("p3d_material_partes").insert({ workspace_id: acesso.workspaceId, material_id: materialId, ...dados });
  if (error) return { error: mensagemEscrita(error, "Não foi possível salvar a cor.") };

  revalidatePath(ROTA);
  return { ok: true };
}

/** "Acabou" / "Desfazer": disponivel = false preenche acabou_em (hoje) no banco; true limpa. */
export async function alternarParteDisponivel(parteId: string, disponivel: boolean): Promise<ActionState> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const { error } = await (await createClient())
    .from("p3d_material_partes")
    .update({ disponivel })
    .eq("id", parteId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: mensagemEscrita(error, "Não foi possível atualizar a cor.") };

  revalidatePath(ROTA);
  return { ok: true };
}

export async function excluirParte(parteId: string): Promise<ActionState> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const { error } = await (await createClient())
    .from("p3d_material_partes")
    .delete()
    .eq("id", parteId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: mensagemEscrita(error, "Não foi possível excluir a cor.") };

  revalidatePath(ROTA);
  return { ok: true };
}

/**
 * "Marcar kit como zerado": ajuste de -1 (um kit acabou) com a observação "Kit acabou". É uma sugestão
 * da tela quando todas as partes acabaram; nunca roda sozinho. Pela RPC, como todo ajuste.
 */
export async function marcarKitZerado(materialId: string): Promise<ActionState> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { data: material } = await supabase
    .from("p3d_materiais")
    .select("estoque_atual, kit")
    .eq("id", materialId)
    .eq("workspace_id", acesso.workspaceId)
    .maybeSingle();
  if (!material) return { error: "Material não encontrado." };
  if (!material.kit) return { error: "Este item não é um kit." };
  if (!(Number(material.estoque_atual) >= 1)) return { error: "O kit já está zerado." };

  const { error } = await supabase.rpc("p3d_movimentar_estoque", {
    p_ws: acesso.workspaceId,
    p_material_id: materialId,
    p_tipo: "ajuste",
    p_quantidade: AJUSTE_KIT_ACABOU,
    p_observacao: OBSERVACAO_KIT_ACABOU,
  });
  if (error) return { error: mensagemRpc(error, "Não foi possível zerar o kit.") };

  await reavaliarAlertas(acesso.workspaceId);
  revalidatePath(ROTA);
  return { ok: true };
}
