/**
 * Regras puras do nicho Impressão 3D (sem banco, sem React): testadas em
 * scripts/testar-acesso.mts. Valores calculados aqui são de EXIBIÇÃO; o preço
 * de verdade vem da RPC p3d_simular_preco / p3d_salvar_item_orcamento.
 */
import type { AcessoModulo } from "@/lib/empresa-ativa";
import type { ConfigPrecificacao, Impressora, Material, PecaDesgaste } from "@/lib/impressao-3d/tipos";

// --- Extra "custos" (só de tela) ---------------------------------------------

/**
 * Extra "custos" de Estoque e Orçamentos (modulos.permissoes_extras). É só de
 * TELA: esconde custo, lucro e margem. Não é barreira de banco; o RLS de quem
 * tem o módulo não distingue colunas. Fundador e cofundador sempre têm.
 */
export const EXTRA_CUSTOS = "custos";

export const SEM_PERMISSAO = "Você não tem permissão para fazer isso.";
export const SEM_PERMISSAO_CUSTOS = "Você não tem permissão para ver ou alterar custos.";

export function podeVerCustos(acesso: Pick<AcessoModulo, "ehDono" | "extras"> | null): boolean {
  return !!acesso && (acesso.ehDono || acesso.extras.includes(EXTRA_CUSTOS));
}

// --- Impressoras -------------------------------------------------------------

/** Depreciação por hora: (aquisição − residual) / vida útil. 0 se a vida útil não foi informada. */
export function depreciacaoPorHora(
  valorAquisicao: number,
  valorResidual: number,
  vidaUtilHoras: number
): number {
  if (!(vidaUtilHoras > 0)) return 0;
  return Math.max(0, valorAquisicao - valorResidual) / vidaUtilHoras;
}

/** Custo/hora das peças de desgaste: soma(custo / vida útil). */
export function desgastePorHora(pecas: readonly Pick<PecaDesgaste, "custo" | "vida_util_horas">[]): number {
  return pecas.reduce((s, p) => s + (p.vida_util_horas > 0 ? p.custo / p.vida_util_horas : 0), 0);
}

/** Manutenção vencida: horas desde a última manutenção chegaram ao intervalo. */
export function manutencaoVencida(
  i: Pick<Impressora, "horas_uso" | "horas_ultima_manutencao" | "intervalo_manutencao_horas">
): boolean {
  return (
    i.intervalo_manutencao_horas != null &&
    i.intervalo_manutencao_horas > 0 &&
    i.horas_uso - i.horas_ultima_manutencao >= i.intervalo_manutencao_horas
  );
}

/** Horas até a próxima manutenção (negativo = vencida). null sem intervalo. */
export function horasParaManutencao(
  i: Pick<Impressora, "horas_uso" | "horas_ultima_manutencao" | "intervalo_manutencao_horas">
): number | null {
  if (i.intervalo_manutencao_horas == null || !(i.intervalo_manutencao_horas > 0)) return null;
  return i.intervalo_manutencao_horas - (i.horas_uso - i.horas_ultima_manutencao);
}

/** Peça de desgaste que já passou da vida útil desde a última troca. */
export function pecaVencida(p: Pick<PecaDesgaste, "vida_util_horas" | "horas_ultima_troca">, horasUso: number): boolean {
  return p.vida_util_horas > 0 && horasUso - p.horas_ultima_troca >= p.vida_util_horas;
}

// --- Estoque -----------------------------------------------------------------

/** Abaixo do mínimo: só vale com mínimo > 0 (mínimo 0 = sem alerta). */
export function abaixoDoMinimo(m: Pick<Material, "estoque_atual" | "estoque_minimo">): boolean {
  return m.estoque_minimo > 0 && m.estoque_atual <= m.estoque_minimo;
}

/** Entrada por rolos: quantidade de rolos × peso líquido → gramas. */
export function gramasDeRolos(rolos: number, pesoLiquidoG: number): number {
  return rolos * pesoLiquidoG;
}

/** Custo/g de cadastro: preço do rolo / peso líquido (0 se faltar dado). */
export function custoPorGrama(precoCompra: number | null, pesoLiquidoG: number | null): number {
  if (precoCompra == null || pesoLiquidoG == null || !(pesoLiquidoG > 0)) return precoCompra ?? 0;
  return precoCompra / pesoLiquidoG;
}

// --- Simulador ---------------------------------------------------------------

/** Chaves numéricas aceitas em p_entrada (ver docs/nicho-impressao-3d.md). */
export const CHAVES_ENTRADA_NUMERICAS = [
  "peso_peca_g", "peso_suporte_g", "peso_brim_g", "peso_purga_g", "peso_total_g",
  "horas_impressao", "quantidade", "preco_por_g", "preco_rolo", "peso_rolo_g",
  "desperdicio_pct", "potencia_media_kw", "tarifa_kwh", "valor_aquisicao", "valor_residual",
  "vida_util_horas", "manutencao_hora", "manutencao_ciclo", "falha_pct", "falha_fracao_perdida",
  "valor_hora_mao_obra", "mao_obra_horas", "acabamento_horas", "montagem_horas", "embalagem_custo",
  "despesas_fixas_pct", "margem_pct", "markup_pct", "impostos_pct", "taxa_pagamento_pct",
  "comissao_pct", "taxa_fixa_pagamento", "preco_minimo", "arredondar_para", "preco_manual",
] as const;

/** O que é DO ITEM (peças, horas, mão de obra, preço manual); o resto vem da config/impressora/material. */
export const CHAVES_DO_ITEM = [
  "impressora_id", "material_id", "materiais", "quantidade",
  "peso_peca_g", "peso_suporte_g", "peso_brim_g", "peso_purga_g", "peso_total_g",
  "horas_impressao", "mao_obra_horas", "acabamento_horas", "montagem_horas",
  "embalagem_custo", "outros_custos", "preco_manual",
] as const;

/**
 * Entrada de um item reduzida ao que é do item. O snapshot guarda os parâmetros
 * efetivamente usados (tarifa, depreciação, preço do material, margem...); para
 * "Recalcular com valores atuais" esses são descartados e a RPC volta a
 * resolvê-los da configuração, da impressora e do material de hoje.
 */
export function entradaParaRecalculo(entrada: Record<string, unknown>): Record<string, unknown> {
  const saida: Record<string, unknown> = {};
  for (const k of CHAVES_DO_ITEM) {
    const v = entrada[k];
    if (v !== undefined && v !== null && v !== "") saida[k] = v;
  }
  return saida;
}

export interface OutroCusto {
  nome: string;
  valor: number;
}

/** Remove vazios e linhas inválidas de "outros custos". */
export function limparOutrosCustos(linhas: readonly { nome: string; valor: string }[]): OutroCusto[] {
  const saida: OutroCusto[] = [];
  for (const l of linhas) {
    const valor = Number(l.valor.replace(",", "."));
    const nome = l.nome.trim();
    if (!nome && !l.valor.trim()) continue;
    if (Number.isFinite(valor) && valor > 0) saida.push({ nome: nome || "Outro custo", valor });
  }
  return saida;
}

/** Padrões do banco para a configuração de uma empresa (usados só se a linha ainda não existir). */
export const CONFIG_PADRAO: ConfigPrecificacao = {
  tarifa_kwh: 0,
  valor_hora_mao_obra: 0,
  desperdicio_pct: 8,
  falha_pct: 7,
  falha_fracao_perdida: 1,
  modo_preco: "margem",
  margem_pct: 30,
  markup_pct: 50,
  impostos_pct: 0,
  taxa_pagamento_pct: 0,
  comissao_pct: 0,
  taxa_fixa_pagamento: 0,
  despesas_fixas_pct: 0,
  arredondar_para: 0,
  preco_minimo: 0,
  base_custo_material: "cadastro",
};
