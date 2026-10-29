/**
 * Leitura defensiva do resultado de p3d_simular_preco / do snapshot de um item
 * de orçamento. O jsonb vem do banco e não é confiável: tudo é coagido para
 * número/lista e nunca derruba a tela. Sem dependência de servidor nem React.
 */

export interface CustosCalculo {
  material: number;
  energia: number;
  depreciacao: number;
  manutencao: number;
  falhas: number;
  mao_obra: number;
  acabamento: number;
  montagem: number;
  embalagem: number;
  outros: number;
  rateio_despesas_fixas: number;
}

export interface CalculoPreco {
  custos: CustosCalculo;
  custo_total: number;
  impostos_valor: number;
  taxas_valor: number;
  preco_recomendado: number;
  preco_final: number;
  lucro: number;
  /** FRAÇÃO (0,25 = 25%). A RPC pode devolver fração ou percentual: ver normalizarFracao. */
  margem_real: number;
  markup_real: number;
  por_unidade: { custo: number; preco: number; lucro: number };
  detalhes: {
    material: { peso_total_g: number; desperdicio_g: number; peso_consumo_g: number; preco_por_g: number };
    energia: { kwh: number; potencia_kw: number; tarifa_kwh: number };
    depreciacao_por_hora: number;
    falha: { tentativas_esperadas: number; custo_de_uma_tentativa: number };
  };
  avisos: string[];
  tipo_valores: string;
  versao_formula: number | null;
}

/** Rótulos da composição, na ordem de exibição (energia separada de depreciação e manutenção). */
export const COMPOSICAO_ROTULO: { chave: keyof CustosCalculo; rotulo: string }[] = [
  { chave: "material", rotulo: "Material" },
  { chave: "energia", rotulo: "Energia elétrica" },
  { chave: "depreciacao", rotulo: "Depreciação da impressora" },
  { chave: "manutencao", rotulo: "Manutenção e desgaste" },
  { chave: "falhas", rotulo: "Falhas (reimpressão)" },
  { chave: "mao_obra", rotulo: "Mão de obra" },
  { chave: "acabamento", rotulo: "Acabamento" },
  { chave: "montagem", rotulo: "Montagem" },
  { chave: "embalagem", rotulo: "Embalagem" },
  { chave: "outros", rotulo: "Outros custos" },
  { chave: "rateio_despesas_fixas", rotulo: "Rateio de despesas fixas" },
];

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function num(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

/**
 * A margem/markup "real" pode vir como fração (0,25) ou percentual (25). Escolhe
 * a leitura que bate com lucro/base; sem base para conferir, valor > 1 é
 * percentual. Sempre devolve FRAÇÃO.
 */
export function normalizarFracao(valor: number, lucro: number, base: number): number {
  if (!Number.isFinite(valor)) return 0;
  if (base > 0) {
    const esperado = lucro / base;
    return Math.abs(valor - esperado) <= Math.abs(valor / 100 - esperado) ? valor : valor / 100;
  }
  return Math.abs(valor) > 1.5 ? valor / 100 : valor;
}

export function lerCalculo(bruto: unknown): CalculoPreco | null {
  const c = obj(bruto);
  if (Object.keys(c).length === 0) return null;
  const custosBruto = obj(c.custos);
  const custos = Object.fromEntries(
    COMPOSICAO_ROTULO.map(({ chave }) => [chave, num(custosBruto[chave])])
  ) as unknown as CustosCalculo;
  const custoTotal = num(c.custo_total);
  const precoFinal = num(c.preco_final);
  const lucro = num(c.lucro);
  const un = obj(c.por_unidade);
  const det = obj(c.detalhes);
  const mat = obj(det.material);
  const en = obj(det.energia);
  const dep = obj(det.depreciacao);
  const fa = obj(det.falha);
  return {
    custos,
    custo_total: custoTotal,
    impostos_valor: num(c.impostos_valor),
    taxas_valor: num(c.taxas_valor),
    preco_recomendado: num(c.preco_recomendado),
    preco_final: precoFinal,
    lucro,
    margem_real: normalizarFracao(num(c.margem_real), lucro, precoFinal),
    markup_real: normalizarFracao(num(c.markup_real), lucro, custoTotal),
    por_unidade: { custo: num(un.custo), preco: num(un.preco), lucro: num(un.lucro) },
    detalhes: {
      material: {
        peso_total_g: num(mat.peso_total_g),
        desperdicio_g: num(mat.desperdicio_g),
        peso_consumo_g: num(mat.peso_consumo_g),
        preco_por_g: num(mat.preco_por_g),
      },
      energia: { kwh: num(en.kwh), potencia_kw: num(en.potencia_kw), tarifa_kwh: num(en.tarifa_kwh) },
      depreciacao_por_hora: num(dep.por_hora),
      falha: {
        tentativas_esperadas: num(fa.tentativas_esperadas),
        custo_de_uma_tentativa: num(fa.custo_de_uma_tentativa),
      },
    },
    avisos: Array.isArray(c.avisos) ? c.avisos.filter((a): a is string => typeof a === "string") : [],
    tipo_valores: typeof c.tipo_valores === "string" ? c.tipo_valores : "estimado",
    versao_formula: typeof c.versao_formula === "number" ? c.versao_formula : null,
  };
}

/** Resposta de p3d_simular_preco: { entrada, calculo }. */
export interface ResultadoSimulacao {
  entrada: Record<string, unknown>;
  calculo: CalculoPreco;
}

export function lerSimulacao(bruto: unknown): ResultadoSimulacao | null {
  const o = obj(bruto);
  const calculo = lerCalculo(o.calculo);
  if (!calculo) return null;
  return { entrada: obj(o.entrada), calculo };
}

/** Rótulos dos parâmetros efetivamente usados (snapshot do item). */
export const ROTULO_PARAMETRO: Record<string, string> = {
  peso_peca_g: "Peso da peça (g)",
  peso_suporte_g: "Peso do suporte (g)",
  peso_brim_g: "Peso do brim (g)",
  peso_purga_g: "Peso da purga (g)",
  peso_total_g: "Peso total do fatiador (g)",
  horas_impressao: "Horas de impressão",
  quantidade: "Quantidade",
  preco_por_g: "Preço do material (R$/g)",
  preco_rolo: "Preço do rolo (R$)",
  peso_rolo_g: "Peso do rolo (g)",
  desperdicio_pct: "Margem de desperdício (%)",
  potencia_media_kw: "Potência média (kW)",
  tarifa_kwh: "Tarifa (R$/kWh)",
  valor_aquisicao: "Valor de aquisição (R$)",
  valor_residual: "Valor residual (R$)",
  vida_util_horas: "Vida útil (h)",
  manutencao_hora: "Manutenção (R$/h)",
  manutencao_ciclo: "Manutenção por ciclo (R$)",
  falha_pct: "Taxa de falhas (%)",
  falha_fracao_perdida: "Fração perdida na falha",
  valor_hora_mao_obra: "Hora de mão de obra (R$)",
  mao_obra_horas: "Horas de mão de obra",
  acabamento_horas: "Horas de acabamento",
  montagem_horas: "Horas de montagem",
  embalagem_custo: "Embalagem (R$)",
  despesas_fixas_pct: "Despesas fixas (%)",
  modo_preco: "Modo de preço",
  margem_pct: "Margem (%)",
  markup_pct: "Markup (%)",
  impostos_pct: "Impostos (%)",
  taxa_pagamento_pct: "Taxa de pagamento (%)",
  comissao_pct: "Comissão (%)",
  taxa_fixa_pagamento: "Taxa fixa de pagamento (R$)",
  preco_minimo: "Preço mínimo (R$)",
  arredondar_para: "Arredondar para (R$)",
  preco_manual: "Preço manual (R$)",
};

/**
 * Remove custo, lucro, margem e markup do cálculo (extra "custos" ausente): ficam
 * só os preços e os avisos. Roda no SERVIDOR antes de a resposta sair — a tela
 * não recebe o que não deve mostrar (é só de tela, não barreira de banco).
 */
export function ocultarCustosDoCalculo(bruto: unknown): Record<string, unknown> {
  const c = obj(bruto);
  const un = obj(c.por_unidade);
  return {
    preco_recomendado: c.preco_recomendado,
    preco_final: c.preco_final,
    por_unidade: { preco: un.preco },
    avisos: c.avisos,
    tipo_valores: c.tipo_valores,
    versao_formula: c.versao_formula,
  };
}
