/**
 * Estado do simulador de preço e a montagem de p_entrada (puro, testável).
 * Regra: só vai para a RPC o que a pessoa preencheu; campo vazio = "usar o
 * padrão" (configuração da empresa, impressora e material). O que vem em
 * p_entrada tem prioridade sobre os padrões.
 */
import { parseNumero } from "@/lib/impressao-3d/numeros";
import { entradaParaRecalculo, limparOutrosCustos, type OutroCusto } from "@/lib/impressao-3d/regras";
import { ROTULO_PARAMETRO } from "@/lib/impressao-3d/calculo";
import { linhasDeEntrada, montarMateriais, type LinhaFilamento } from "@/lib/impressao-3d/filamentos";
import type { ConfigPrecificacao } from "@/lib/impressao-3d/tipos";

export type PesoModo = "detalhado" | "total";

export interface EstadoSimulador {
  impressora_id: string;
  material_id: string;
  /** Vários filamentos (p_entrada.materiais), pesos do LOTE. Com alguma linha preenchida, a lista vale no lugar do material único. */
  filamentos: LinhaFilamento[];
  quantidade: string;
  pesoModo: PesoModo;
  /** Campos numéricos por chave de p_entrada (texto do formulário). */
  campos: Record<string, string>;
  outros: { nome: string; valor: string }[];
  modo_preco: "margem" | "markup";
}

export const ESTADO_VAZIO: EstadoSimulador = {
  impressora_id: "",
  material_id: "",
  filamentos: [],
  quantidade: "1",
  pesoModo: "detalhado",
  campos: {},
  outros: [],
  modo_preco: "margem",
};

/** Parâmetros avançados editáveis só para a simulação, na ordem da tela. */
export const PARAMETROS_AVANCADOS: { chave: string; grupo: string; passo?: string }[] = [
  { chave: "desperdicio_pct", grupo: "Material" },
  { chave: "preco_por_g", grupo: "Material" },
  { chave: "preco_rolo", grupo: "Material" },
  { chave: "peso_rolo_g", grupo: "Material" },
  { chave: "potencia_media_kw", grupo: "Energia" },
  { chave: "tarifa_kwh", grupo: "Energia" },
  { chave: "valor_aquisicao", grupo: "Impressora" },
  { chave: "valor_residual", grupo: "Impressora" },
  { chave: "vida_util_horas", grupo: "Impressora" },
  { chave: "manutencao_hora", grupo: "Impressora" },
  { chave: "manutencao_ciclo", grupo: "Impressora" },
  { chave: "falha_pct", grupo: "Falhas" },
  { chave: "falha_fracao_perdida", grupo: "Falhas" },
  { chave: "valor_hora_mao_obra", grupo: "Mão de obra e despesas" },
  { chave: "despesas_fixas_pct", grupo: "Mão de obra e despesas" },
  { chave: "impostos_pct", grupo: "Venda" },
  { chave: "taxa_pagamento_pct", grupo: "Venda" },
  { chave: "comissao_pct", grupo: "Venda" },
  { chave: "taxa_fixa_pagamento", grupo: "Venda" },
  { chave: "preco_minimo", grupo: "Venda" },
  { chave: "arredondar_para", grupo: "Venda" },
];

export interface EntradaMontada {
  entrada: Record<string, unknown>;
  erros: string[];
}

const CHAVES_PESO_DETALHADO = ["peso_peca_g", "peso_suporte_g", "peso_brim_g", "peso_purga_g"];
const CHAVES_BASE = [
  "horas_impressao", "mao_obra_horas", "acabamento_horas", "montagem_horas", "embalagem_custo", "preco_manual",
];

/** Monta p_entrada a partir do formulário; devolve também os erros de leitura. */
export function montarEntrada(e: EstadoSimulador, config: ConfigPrecificacao | null): EntradaMontada {
  const entrada: Record<string, unknown> = {};
  const erros: string[] = [];

  function numero(chave: string, texto: string | undefined, opcoes: { inteiro?: boolean; positivo?: boolean } = {}) {
    const n = parseNumero(texto);
    if (n === null) return;
    const rotulo = ROTULO_PARAMETRO[chave] ?? chave;
    if (Number.isNaN(n) || n < 0) {
      erros.push(`${rotulo}: informe um número válido (zero ou maior).`);
      return;
    }
    if (opcoes.inteiro && !Number.isInteger(n)) {
      erros.push(`${rotulo}: use um número inteiro.`);
      return;
    }
    if (opcoes.positivo && n <= 0) {
      erros.push(`${rotulo}: informe um valor maior que zero.`);
      return;
    }
    entrada[chave] = n;
  }

  // Lista de filamentos: quando há linha com peso, ela é a fonte do material e do peso (nada de
  // material_id, preço do material nem pesos no topo).
  const lista = montarMateriais(e.filamentos, 1);
  erros.push(...lista.erros);
  const usaLista = lista.materiais.length > 0;
  if (usaLista) entrada.materiais = lista.materiais;

  if (e.impressora_id) entrada.impressora_id = e.impressora_id;
  if (e.material_id && !usaLista) entrada.material_id = e.material_id;

  const q = parseNumero(e.quantidade);
  if (q === null || Number.isNaN(q) || !Number.isInteger(q) || q <= 0) {
    erros.push("Quantidade: informe um número inteiro maior que zero.");
  } else {
    entrada.quantidade = q;
  }

  if (usaLista) {
    // O peso vem das linhas de filamento.
  } else if (e.pesoModo === "total") {
    numero("peso_total_g", e.campos.peso_total_g);
    // A purga é um subconjunto do total do fatiador: informada só para não receber margem de desperdício.
    numero("peso_purga_g", e.campos.peso_purga_g);
  } else {
    for (const k of CHAVES_PESO_DETALHADO) numero(k, e.campos[k]);
  }
  for (const k of CHAVES_BASE) numero(k, e.campos[k]);

  const outros: OutroCusto[] = limparOutrosCustos(e.outros);
  const preenchidos = e.outros.filter((o) => o.nome.trim() || o.valor.trim()).length;
  if (outros.length !== preenchidos) erros.push("Outros custos: informe um valor maior que zero em cada linha.");
  if (outros.length > 0) entrada.outros_custos = outros;

  const DO_MATERIAL_UNICO = ["preco_por_g", "preco_rolo", "peso_rolo_g"];
  for (const { chave } of PARAMETROS_AVANCADOS) {
    if (usaLista && DO_MATERIAL_UNICO.includes(chave)) continue;
    numero(chave, e.campos[chave]);
  }

  // Modo de preço: só é enviado o que difere da configuração (ou o que foi digitado).
  if (!config || e.modo_preco !== config.modo_preco) entrada.modo_preco = e.modo_preco;
  numero(e.modo_preco === "margem" ? "margem_pct" : "markup_pct", e.campos[e.modo_preco === "margem" ? "margem_pct" : "markup_pct"]);
  if (typeof entrada.margem_pct === "number" && entrada.margem_pct >= 100) {
    erros.push("Margem (%): use um valor menor que 100.");
  }

  return { entrada, erros };
}

/** Texto vazio → número ou "" para preencher o formulário. */
function txt(v: unknown): string {
  return typeof v === "number" && Number.isFinite(v) ? String(v) : "";
}

/**
 * Estado do formulário a partir de uma entrada salva (editar item). O snapshot
 * traz todos os parâmetros efetivamente usados: aparecem preenchidos e são
 * reenviados como estão. Peso total presente = modo "total".
 */
export function estadoDeEntrada(entrada: Record<string, unknown>): EstadoSimulador {
  const campos: Record<string, string> = {};
  for (const [k, v] of Object.entries(entrada)) {
    const t = txt(v);
    if (t !== "") campos[k] = t;
  }
  const outrosBrutos = Array.isArray(entrada.outros_custos) ? entrada.outros_custos : [];
  const outros = outrosBrutos
    .filter((o): o is { nome?: unknown; valor?: unknown } => !!o && typeof o === "object")
    .map((o) => ({ nome: typeof o.nome === "string" ? o.nome : "", valor: txt(o.valor) }));
  return {
    impressora_id: typeof entrada.impressora_id === "string" ? entrada.impressora_id : "",
    material_id: typeof entrada.material_id === "string" ? entrada.material_id : "",
    filamentos: linhasDeEntrada(entrada.materiais),
    quantidade: txt(entrada.quantidade) || "1",
    pesoModo: typeof entrada.peso_total_g === "number" && entrada.peso_total_g > 0 ? "total" : "detalhado",
    campos,
    outros,
    modo_preco: entrada.modo_preco === "markup" ? "markup" : "margem",
  };
}

/**
 * Estado para EDITAR um item salvo: carrega só o que é do item (pesos, horas,
 * mão de obra, preço manual) e o modo/percentual de preço quando diferem da
 * configuração. Preço do material, tarifa, depreciação etc. voltam a ser
 * resolvidos com os valores de hoje; o snapshot antigo continua visível até salvar.
 */
export function estadoParaEdicao(
  entrada: Record<string, unknown>,
  config: ConfigPrecificacao | null
): EstadoSimulador {
  const estado = estadoDeEntrada(entradaParaRecalculo(entrada));
  if (entrada.modo_preco === "margem" || entrada.modo_preco === "markup") estado.modo_preco = entrada.modo_preco;
  const chavePct = estado.modo_preco === "margem" ? "margem_pct" : "markup_pct";
  const pct = entrada[chavePct];
  if (typeof pct === "number" && (!config || pct !== config[chavePct])) estado.campos[chavePct] = String(pct);
  return estado;
}
