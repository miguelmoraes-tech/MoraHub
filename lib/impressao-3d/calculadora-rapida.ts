/**
 * Calculadora rápida de preço (Impressão 3D): estado do formulário e montagem de p_entrada
 * (puro, testável). A tela NUNCA calcula preço: ela só monta a entrada e mostra o retorno de
 * p3d_simular_preco. As conversões daqui (multiplicador ↔ markup_pct, tempo × quantidade, W → kW)
 * são de ENTRADA; o que sai é sempre o que a RPC devolveu.
 *
 * No modo rápido o cálculo é só material + depreciação + energia + multiplicador: tudo o mais
 * vai explicitamente como 0 (o que vem em p_entrada vence config/impressora/material, inclusive 0),
 * e só entra o que a pessoa marcar em "Incluir também".
 */
import { parseNumero } from "@/lib/impressao-3d/numeros";
import {
  BASE_GRAMAS_PADRAO, fatorDaBase, montarMateriais, novaLinhaFilamento, type BaseGramas, type LinhaFilamento,
} from "@/lib/impressao-3d/filamentos";
import type { ConfigPrecificacao } from "@/lib/impressao-3d/tipos";

export const MULTIPLICADOR_PADRAO = 5;

/** Chaves de p_entrada forçadas a 0 no modo rápido (a menos que o extra correspondente esteja marcado). */
export const ZEROS_MODO_RAPIDO = [
  "desperdicio_pct", "falha_pct", "manutencao_hora", "manutencao_ciclo", "mao_obra_horas",
  "acabamento_horas", "montagem_horas", "embalagem_custo", "despesas_fixas_pct", "impostos_pct",
  "taxa_pagamento_pct", "comissao_pct", "taxa_fixa_pagamento", "preco_minimo", "arredondar_para",
] as const;

export type ExtraRapido = "desperdicio" | "falhas" | "manutencao" | "mao_obra" | "embalagem" | "impostos";

export interface CampoExtra {
  chave: string;
  rotulo: string;
  ajuda?: string;
}

/** O que cada caixa de "Incluir também" libera, na ordem da tela. */
export const EXTRAS_RAPIDOS: { chave: ExtraRapido; rotulo: string; descricao: string; campos: CampoExtra[] }[] = [
  {
    chave: "desperdicio",
    rotulo: "Desperdício de material",
    descricao: "Purga, trocas de cor e sobras.",
    campos: [{ chave: "desperdicio_pct", rotulo: "Desperdício (%)" }],
  },
  {
    chave: "falhas",
    rotulo: "Falhas de impressão",
    descricao: "Reimpressões das peças que dão errado.",
    campos: [{ chave: "falha_pct", rotulo: "Taxa de falhas (%)" }],
  },
  {
    chave: "manutencao",
    rotulo: "Manutenção",
    descricao: "Desgaste e manutenção da impressora.",
    campos: [
      { chave: "manutencao_hora", rotulo: "Manutenção (R$/hora)" },
      { chave: "manutencao_ciclo", rotulo: "Manutenção (R$/ciclo)" },
    ],
  },
  {
    chave: "mao_obra",
    rotulo: "Mão de obra e acabamento",
    descricao: "Horas do seu trabalho no lote.",
    campos: [
      { chave: "valor_hora_mao_obra", rotulo: "Valor da hora (R$)" },
      { chave: "mao_obra_horas", rotulo: "Mão de obra (h do lote)" },
      { chave: "acabamento_horas", rotulo: "Acabamento (h do lote)" },
      { chave: "montagem_horas", rotulo: "Montagem (h do lote)" },
    ],
  },
  {
    chave: "embalagem",
    rotulo: "Embalagem",
    descricao: "Caixa, saco, enchimento.",
    campos: [{ chave: "embalagem_custo", rotulo: "Embalagem (R$ do lote)" }],
  },
  {
    chave: "impostos",
    rotulo: "Impostos e taxas",
    descricao: "Incidem sobre o preço de venda.",
    campos: [
      { chave: "impostos_pct", rotulo: "Impostos (%)" },
      { chave: "taxa_pagamento_pct", rotulo: "Taxa de pagamento (%)" },
      { chave: "comissao_pct", rotulo: "Comissão (%)" },
      { chave: "taxa_fixa_pagamento", rotulo: "Taxa fixa por venda (R$)" },
    ],
  },
];

export type ModoPrecoRapido = "multiplicador" | "margem";

export interface EstadoRapido {
  nomePeca: string;
  /** Filamentos usados no projeto (mínimo 1 linha). */
  filamentos: LinhaFilamento[];
  /** As gramas (e o tempo) digitados são de UMA peça (padrão, o que o fatiador mostra) ou do projeto todo. */
  base: BaseGramas;
  impressora_id: string;
  /** Por peça (o que o fatiador mostra). */
  horas: string;
  minutos: string;
  quantidade: string;
  tarifa_kwh: string;
  modo: ModoPrecoRapido;
  multiplicador: string;
  margem_pct: string;
  extras: Record<ExtraRapido, boolean>;
  /** Valores dos campos de "Incluir também" (texto do formulário). */
  valores: Record<string, string>;
}

export const EXTRAS_DESMARCADOS: Record<ExtraRapido, boolean> = {
  desperdicio: false, falhas: false, manutencao: false, mao_obra: false, embalagem: false, impostos: false,
};

// --- Multiplicador ↔ markup ---------------------------------------------------------------------

function arredondar(n: number, casas = 6): number {
  const f = 10 ** casas;
  return Math.round(n * f) / f;
}

/** ×5 → 400. O banco guarda markup_pct = (multiplicador − 1) × 100. */
export function multiplicadorParaMarkupPct(multiplicador: number): number {
  return arredondar((multiplicador - 1) * 100);
}

/** 400 → ×5. */
export function markupPctParaMultiplicador(markupPct: number): number {
  return arredondar(1 + markupPct / 100);
}

/** Multiplicador inicial: o da configuração quando ela é markup (> 0); senão ×5. */
export function multiplicadorInicial(config: Pick<ConfigPrecificacao, "modo_preco" | "markup_pct"> | null): number {
  if (config && config.modo_preco === "markup" && config.markup_pct > 0) {
    return markupPctParaMultiplicador(config.markup_pct);
  }
  return MULTIPLICADOR_PADRAO;
}

/** "×5 = lucro de 4× o custo (margem de 80%)": só explica a conversão, não calcula preço. */
export function explicarMultiplicador(multiplicador: number): string | null {
  if (!Number.isFinite(multiplicador) || multiplicador < 1) return null;
  const vezes = arredondar(multiplicador - 1, 2);
  const margem = arredondar((1 - 1 / multiplicador) * 100, 1);
  return `×${fmt(multiplicador)} = lucro de ${fmt(vezes)}× o custo (margem de ${fmt(margem)}%)`;
}

/** "Margem de 40% equivale a multiplicador ×1,67". */
export function explicarMargem(margemPct: number): string | null {
  if (!Number.isFinite(margemPct) || margemPct < 0 || margemPct >= 100) return null;
  const mult = arredondar(1 / (1 - margemPct / 100), 2);
  return `Margem de ${fmt(margemPct)}% = lucro de ${fmt(margemPct)}% do preço (equivale a ×${fmt(mult)} sobre o custo)`;
}

function fmt(n: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(n);
}

// --- Cadastros: W ↔ kW --------------------------------------------------------------------------

/** Watts digitados → potencia_media_kw gravada (120 W → 0,12 kW). */
export function wattsParaKw(watts: number): number {
  return arredondar(watts / 1000, 6);
}

/** potencia_media_kw gravada → watts mostrados (0,12 kW → 120 W). */
export function kwParaWatts(kw: number): number {
  return arredondar(kw * 1000, 2);
}

// --- Estado inicial -----------------------------------------------------------------------------

/** Valores de "Incluir também" já preenchidos com a configuração da empresa (e a impressora, se houver). */
export function valoresIniciaisExtras(
  config: ConfigPrecificacao | null,
  impressora: { manutencao_hora: number; manutencao_ciclo: number } | null
): Record<string, string> {
  const t = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? String(v) : "");
  return {
    desperdicio_pct: t(config?.desperdicio_pct),
    falha_pct: t(config?.falha_pct),
    manutencao_hora: t(impressora?.manutencao_hora),
    manutencao_ciclo: t(impressora?.manutencao_ciclo),
    valor_hora_mao_obra: t(config?.valor_hora_mao_obra),
    mao_obra_horas: "",
    acabamento_horas: "",
    montagem_horas: "",
    embalagem_custo: "",
    impostos_pct: t(config?.impostos_pct),
    taxa_pagamento_pct: t(config?.taxa_pagamento_pct),
    comissao_pct: t(config?.comissao_pct),
    taxa_fixa_pagamento: t(config?.taxa_fixa_pagamento),
  };
}

export function estadoInicialRapido(config: ConfigPrecificacao | null): EstadoRapido {
  return {
    nomePeca: "",
    filamentos: [novaLinhaFilamento()],
    base: BASE_GRAMAS_PADRAO,
    impressora_id: "",
    horas: "",
    minutos: "",
    quantidade: "1",
    tarifa_kwh: config && config.tarifa_kwh > 0 ? String(config.tarifa_kwh) : "",
    modo: "multiplicador",
    multiplicador: String(multiplicadorInicial(config)),
    margem_pct: "",
    extras: { ...EXTRAS_DESMARCADOS },
    valores: valoresIniciaisExtras(config, null),
  };
}

// --- Montagem da entrada ------------------------------------------------------------------------

export interface EntradaRapida {
  /** `id` da linha da tela de cada item de entrada.materiais (para mostrar o custo por filamento). */
  linhaIds?: string[];
  entrada: Record<string, unknown>;
  erros: string[];
  /** Avisos de tela sobre o que ficou de fora (não vêm da RPC). */
  avisos: string[];
  /** Há dados mínimos (peso ou tempo) para pedir o cálculo. */
  pronta: boolean;
}

const ROTULO_CAMPO: Record<string, string> = {
  tarifa_kwh: "Tarifa de energia",
  horas: "Horas",
  minutos: "Minutos",
  multiplicador: "Multiplicador",
  margem_pct: "Margem",
};

export function montarEntradaRapida(
  e: EstadoRapido,
  opcoes: { semImpressoras?: boolean } = {}
): EntradaRapida {
  const entrada: Record<string, unknown> = {};
  const erros: string[] = [];
  const avisos: string[] = [];

  function lerNumero(
    texto: string,
    rotulo: string,
    regra: { positivo?: boolean; max?: number; maxExclusivo?: number; min?: number } = {}
  ): number | null {
    const n = parseNumero(texto);
    if (n === null) return null;
    if (Number.isNaN(n) || n < (regra.min ?? 0)) {
      erros.push(`${rotulo}: informe um número válido (zero ou maior).`);
      return null;
    }
    if (regra.positivo && n <= 0) {
      erros.push(`${rotulo}: informe um valor maior que zero.`);
      return null;
    }
    if (regra.max !== undefined && n > regra.max) {
      erros.push(`${rotulo}: use um valor de até ${regra.max}.`);
      return null;
    }
    if (regra.maxExclusivo !== undefined && n >= regra.maxExclusivo) {
      erros.push(`${rotulo}: use um valor menor que ${regra.maxExclusivo}.`);
      return null;
    }
    return n;
  }

  // Quantidade: o lote inteiro = valor por peça × x.
  const q = parseNumero(e.quantidade);
  let x = 1;
  if (q === null || Number.isNaN(q) || !Number.isInteger(q) || q <= 0) {
    erros.push("Quantidade de peças: informe um número inteiro maior que zero.");
  } else {
    x = q;
  }
  entrada.quantidade = x;

  const horasPeca = (() => {
    const h = lerNumero(e.horas, ROTULO_CAMPO.horas);
    const m = lerNumero(e.minutos, ROTULO_CAMPO.minutos);
    if (h === null && m === null) return null;
    return (h ?? 0) + (m ?? 0) / 60;
  })();
  // "Por peça": gramas e tempo digitados valem para UMA peça e viram os do lote (× quantidade).
  // "Do projeto todo": vão como informados, sem multiplicar de novo.
  const fator = fatorDaBase(e.base, x);
  entrada.horas_impressao = arredondar((horasPeca ?? 0) * fator);

  // Filamentos: a RPC recebe o peso do LOTE. Com a lista, nada de material_id/preco_por_g/peso no
  // topo (a lista é a fonte).
  const mats = montarMateriais(e.filamentos, fator);
  erros.push(...mats.erros);
  avisos.push(...mats.avisos);
  if (mats.materiais.length > 0) {
    entrada.materiais = mats.materiais;
  } else {
    entrada.peso_peca_g = 0;
    if (!mats.erros.length && !mats.avisos.length) avisos.push("Sem filamento e peso, o custo do material fica zerado.");
  }
  const temPeso = mats.materiais.length > 0;

  // Impressora: sem ela, energia e depreciação ficam zeradas (explícito, não o padrão de ninguém).
  if (e.impressora_id) {
    entrada.impressora_id = e.impressora_id;
  } else {
    entrada.potencia_media_kw = 0;
    entrada.valor_aquisicao = 0;
    entrada.valor_residual = 0;
    avisos.push(
      opcoes.semImpressoras
        ? "Nenhuma impressora cadastrada: energia e depreciação ficam zeradas até você cadastrar uma."
        : "Sem impressora escolhida, energia e depreciação ficam zeradas."
    );
  }
  if ((horasPeca ?? 0) <= 0 && temPeso) {
    avisos.push("Sem o tempo de impressão, energia e depreciação ficam zeradas. Informe o tempo para elas entrarem no custo.");
  }

  const tarifa = lerNumero(e.tarifa_kwh, ROTULO_CAMPO.tarifa_kwh);
  if (tarifa !== null) entrada.tarifa_kwh = tarifa;

  // Preço de venda: multiplicador (markup) ou margem.
  if (e.modo === "multiplicador") {
    const m = parseNumero(e.multiplicador);
    if (m === null || Number.isNaN(m) || m < 1) {
      erros.push("Multiplicador: informe um valor igual ou maior que 1.");
    } else {
      entrada.modo_preco = "markup";
      entrada.markup_pct = multiplicadorParaMarkupPct(m);
    }
  } else {
    const m = parseNumero(e.margem_pct);
    if (m === null || Number.isNaN(m) || m < 0 || m >= 100) {
      erros.push("Margem (%): informe um valor de 0 a menos de 100.");
    } else {
      entrada.modo_preco = "margem";
      entrada.margem_pct = m;
    }
  }

  // Tudo o que não é material + depreciação + energia vai como 0 explícito...
  for (const chave of ZEROS_MODO_RAPIDO) entrada[chave] = 0;
  // ...menos o que foi marcado em "Incluir também" (valor vazio continua 0).
  for (const extra of EXTRAS_RAPIDOS) {
    if (!e.extras[extra.chave]) continue;
    for (const campo of extra.campos) {
      const max = campo.chave.endsWith("_pct") ? 100 : undefined;
      const n = lerNumero(e.valores[campo.chave] ?? "", campo.rotulo, { max });
      entrada[campo.chave] = n ?? 0;
    }
  }

  const pronta = temPeso || (horasPeca ?? 0) > 0;
  return { entrada, erros, avisos, pronta, linhaIds: mats.linhaIds };
}

// --- Resumo para WhatsApp -----------------------------------------------------------------------

/** Texto pronto para enviar ao cliente: peça, quantidade, preço por peça e total. Sem custos. */
export function resumoWhatsapp(d: {
  nomePeca: string;
  quantidade: number;
  precoUnidade: string;
  precoTotal: string;
}): string {
  const nome = d.nomePeca.trim() || "Peça impressa em 3D";
  return [
    `*${nome}*`,
    `Quantidade: ${d.quantidade} ${d.quantidade === 1 ? "peça" : "peças"}`,
    `Preço por peça: ${d.precoUnidade}`,
    `Total: ${d.precoTotal}`,
  ].join("\n");
}

// --- Cadastros: custo/hora da impressora --------------------------------------------------------

/**
 * Confirmação ao vivo no cadastro da impressora: depreciação e energia por hora.
 * É custo por hora (não preço): o preço continua só na RPC.
 */
export function custoHoraImpressora(d: {
  aquisicao: number;
  residual: number;
  vidaUtilHoras: number;
  watts: number;
  tarifaKwh: number;
}): { depreciacao: number; energia: number; total: number } {
  const depreciacao = d.vidaUtilHoras > 0 ? Math.max(0, d.aquisicao - d.residual) / d.vidaUtilHoras : 0;
  const energia = wattsParaKw(d.watts) * Math.max(0, d.tarifaKwh);
  return { depreciacao, energia, total: depreciacao + energia };
}
