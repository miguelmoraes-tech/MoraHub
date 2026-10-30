/**
 * Filamentos do nicho Impressão 3D (puro, testável): valor do kg ↔ preço por g, "quanto comprei" em
 * kg ou g, linhas de filamento da calculadora/simulador/orçamento (p_entrada.materiais) e o consumo
 * real na conclusão de um trabalho com vários materiais. A tela NUNCA recalcula preço nem saldo:
 * aqui só se converte unidade e se monta a entrada; custo e saldo vêm do banco.
 */
import { parseNumero } from "@/lib/impressao-3d/numeros";

/** O cadastro simples guarda o valor do kg em preco_compra e o rolo como 1000 g (custo/g = valor do kg ÷ 1000). */
export const PESO_KG_G = 1000;

function arredondar(n: number, casas: number): number {
  const f = 10 ** casas;
  return Math.round(n * f) / f;
}

/** Valor do kg → preço por g (R$ 89,90/kg = R$ 0,0899/g). */
export function precoPorGDeValorKg(valorKg: number): number {
  return arredondar(valorKg / PESO_KG_G, 8);
}

/** Valor do kg → o que o cadastro grava em p3d_materiais. */
export function cadastroDeValorKg(valorKg: number): { preco_compra: number; peso_liquido_rolo_g: number } {
  return { preco_compra: valorKg, peso_liquido_rolo_g: PESO_KG_G };
}

/** Custo por kg a partir do custo por g que o banco devolve (só exibição). */
export function custoPorKgDeG(custoPorG: number): number {
  return arredondar(custoPorG * PESO_KG_G, 4);
}

export type UnidadePeso = "kg" | "g";

/** kg → g (ou g → g). */
export function paraGramas(quantidade: number, unidade: UnidadePeso): number {
  return unidade === "kg" ? arredondar(quantidade * PESO_KG_G, 3) : quantidade;
}

/** gramas → kg para exibir o saldo ("2,5 kg"); abaixo de 1 kg continua em g. */
export function formatarSaldoPeso(gramas: number): { valor: number; unidade: UnidadePeso } {
  return Math.abs(gramas) >= PESO_KG_G
    ? { valor: arredondar(gramas / PESO_KG_G, 3), unidade: "kg" }
    : { valor: arredondar(gramas, 1), unidade: "g" };
}

/**
 * "Quanto comprei" + valor pago por kg → entrada de estoque: quantidade em gramas e custo_total = kg ×
 * valor do kg. Zero (ou vazio) = só cadastra (null). Sem valor do kg, a entrada vai sem custo.
 */
export function entradaDeCompraKg(d: {
  quantidade: number;
  unidade: UnidadePeso;
  valorKg: number | null;
}): { quantidade: number; custoTotal: number | null } | null {
  if (!(d.quantidade > 0)) return null;
  const gramas = paraGramas(d.quantidade, d.unidade);
  const kg = gramas / PESO_KG_G;
  return {
    quantidade: gramas,
    custoTotal: d.valorKg != null && d.valorKg > 0 ? arredondar(kg * d.valorKg, 2) : null,
  };
}

/** Material que não é pesado (resina em ml, insumo em un): quantidade na unidade dele × preço da unidade. */
export function entradaDeCompraUnidade(d: {
  quantidade: number;
  precoUnitario: number | null;
}): { quantidade: number; custoTotal: number | null } | null {
  if (!(d.quantidade > 0)) return null;
  return {
    quantidade: d.quantidade,
    custoTotal: d.precoUnitario != null && d.precoUnitario > 0 ? arredondar(d.quantidade * d.precoUnitario, 2) : null,
  };
}

// --- Linhas de filamento (calculadora, simulador, orçamento) ------------------------------------

export interface LinhaFilamento {
  /** Chave só da tela. */
  id: string;
  origem: "estoque" | "manual";
  material_id: string;
  /** Manual ("informar na hora"). */
  nome: string;
  cor: string;
  valor_kg: string;
  /** Texto do formulário: por peça na calculadora; do lote no simulador/orçamento. */
  peso_g: string;
}

let contador = 0;
export function novaLinhaFilamento(parcial: Partial<LinhaFilamento> = {}): LinhaFilamento {
  contador += 1;
  return { id: `f${contador}`, origem: "estoque", material_id: "", nome: "", cor: "", valor_kg: "", peso_g: "", ...parcial };
}

/** Uma linha de p_entrada.materiais, como a RPC lê. */
export type MaterialEntrada =
  | { material_id: string; peso_g: number }
  | { nome: string; cor?: string; peso_g: number; preco_por_g: number };

export interface MateriaisMontados {
  materiais: MaterialEntrada[];
  erros: string[];
  avisos: string[];
}

/**
 * Linhas → p_entrada.materiais. `fator` é a quantidade de peças (calculadora: peso por peça × x vira o
 * peso do LOTE); no simulador/orçamento o peso já é do lote (fator 1). Linha sem peso é ignorada.
 */
export function montarMateriais(linhas: readonly LinhaFilamento[], fator = 1): MateriaisMontados {
  const materiais: MaterialEntrada[] = [];
  const erros: string[] = [];
  const avisos: string[] = [];

  linhas.forEach((l, i) => {
    const n = i + 1;
    const peso = parseNumero(l.peso_g);
    if (peso === null) return;
    if (Number.isNaN(peso) || peso < 0) {
      erros.push(`Filamento ${n}: informe um peso válido (zero ou maior).`);
      return;
    }
    if (peso === 0) return;
    const pesoLote = arredondar(peso * fator, 3);

    if (l.origem === "estoque") {
      if (!l.material_id) {
        avisos.push(`Filamento ${n}: escolha o filamento do estoque (ou informe na hora) para o custo entrar.`);
        return;
      }
      materiais.push({ material_id: l.material_id, peso_g: pesoLote });
      return;
    }

    const valorKg = parseNumero(l.valor_kg);
    if (valorKg === null || Number.isNaN(valorKg) || valorKg <= 0) {
      erros.push(`Filamento ${n}: informe o valor do kg (maior que zero).`);
      return;
    }
    const nome = l.nome.trim() || `Filamento ${n}`;
    const cor = l.cor.trim();
    materiais.push({
      nome,
      ...(cor ? { cor } : {}),
      peso_g: pesoLote,
      preco_por_g: precoPorGDeValorKg(valorKg),
    });
  });

  return { materiais, erros, avisos };
}

/** Lista guardada na entrada (snapshot de item, rascunho) → linhas da tela. Pesos em g do LOTE. */
export function linhasDeEntrada(bruto: unknown): LinhaFilamento[] {
  if (!Array.isArray(bruto)) return [];
  const saida: LinhaFilamento[] = [];
  for (const x of bruto) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const peso = typeof o.peso_g === "number" && Number.isFinite(o.peso_g) ? String(o.peso_g) : "";
    if (typeof o.material_id === "string" && o.material_id) {
      saida.push(novaLinhaFilamento({ origem: "estoque", material_id: o.material_id, peso_g: peso }));
    } else if (typeof o.nome === "string") {
      const preco = typeof o.preco_por_g === "number" && Number.isFinite(o.preco_por_g) ? o.preco_por_g : 0;
      saida.push(
        novaLinhaFilamento({
          origem: "manual",
          nome: o.nome,
          cor: typeof o.cor === "string" ? o.cor : "",
          valor_kg: preco > 0 ? String(arredondar(preco * PESO_KG_G, 4)) : "",
          peso_g: peso,
        })
      );
    }
  }
  return saida;
}

/** Peso total do filamento do estoque pedido nas linhas (todas as linhas do mesmo material somam). */
export interface FaltaDeEstoque {
  material_id: string;
  precisa: number;
  tem: number;
  falta: number;
}

/**
 * Comparação INFORMATIVA entre o peso do lote e o saldo do estoque: "faltam X g". Não bloqueia nada e
 * não altera saldo; o saldo vem do banco.
 */
export function faltaDeEstoque(
  materiais: readonly MaterialEntrada[],
  saldos: Readonly<Record<string, number>>
): FaltaDeEstoque[] {
  const precisa = new Map<string, number>();
  for (const m of materiais) {
    if ("material_id" in m) precisa.set(m.material_id, (precisa.get(m.material_id) ?? 0) + m.peso_g);
  }
  const saida: FaltaDeEstoque[] = [];
  for (const [id, total] of precisa) {
    const tem = saldos[id];
    if (tem === undefined) continue;
    if (total > tem) saida.push({ material_id: id, precisa: arredondar(total, 3), tem, falta: arredondar(total - tem, 3) });
  }
  return saida;
}

// --- Conclusão de trabalho com vários materiais ---------------------------------------------------

export interface LinhaConsumo {
  material_id: string;
  /** Texto do formulário (g). */
  peso_real_g: string;
}

/**
 * Consumo real por filamento → p_consumos de p3d_concluir_producao_multi. Exige TODOS os materiais do
 * trabalho, cada um com peso real (zero é aceito: o material não foi usado), sem repetir material.
 */
export function montarConsumos(
  linhas: readonly LinhaConsumo[],
  materiaisDoTrabalho: readonly string[]
): { consumos: { material_id: string; peso_real_g: number }[]; erros: string[] } {
  const erros: string[] = [];
  const consumos: { material_id: string; peso_real_g: number }[] = [];
  const vistos = new Set<string>();
  for (const l of linhas) {
    if (vistos.has(l.material_id)) {
      erros.push("Cada filamento deve aparecer uma vez só.");
      continue;
    }
    vistos.add(l.material_id);
    const peso = parseNumero(l.peso_real_g);
    if (peso === null || Number.isNaN(peso) || peso < 0) {
      erros.push("Peso real: informe o consumo de cada filamento (zero ou maior).");
      continue;
    }
    consumos.push({ material_id: l.material_id, peso_real_g: peso });
  }
  for (const id of materiaisDoTrabalho) {
    if (!vistos.has(id)) erros.push("Informe o consumo de todos os filamentos do trabalho.");
  }
  return { consumos, erros: [...new Set(erros)] };
}

// --- Filamentos de um trabalho de produção (p3d_producao_materiais) ---------------------------------

export interface LinhaTrabalho {
  material_id: string;
  peso_estimado_g: number;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Linhas da tela (só filamentos do estoque) → linhas do trabalho. Linha sem peso é ignorada. */
export function linhasParaTrabalho(linhas: readonly LinhaFilamento[]): { linhas: LinhaTrabalho[]; erros: string[] } {
  const saida: LinhaTrabalho[] = [];
  const erros: string[] = [];
  linhas.forEach((l, i) => {
    const peso = parseNumero(l.peso_g);
    if (peso === null || peso === 0) return;
    if (Number.isNaN(peso) || peso < 0) {
      erros.push(`Filamento ${i + 1}: informe um peso válido (maior que zero).`);
      return;
    }
    if (!l.material_id) {
      erros.push(`Filamento ${i + 1}: escolha o filamento do estoque.`);
      return;
    }
    saida.push({ material_id: l.material_id, peso_estimado_g: peso });
  });
  return { linhas: saida, erros: [...erros, ...(new Set(saida.map((x) => x.material_id)).size < saida.length ? ["Cada filamento deve aparecer uma vez só."] : [])] };
}

/** Lê o JSON das linhas enviado pelo formulário (servidor: nunca confia no cliente). */
export function lerLinhasTrabalho(bruto: unknown): { linhas: LinhaTrabalho[]; erro: string | null } {
  if (bruto === null || bruto === undefined || bruto === "") return { linhas: [], erro: null };
  let valor: unknown = bruto;
  if (typeof bruto === "string") {
    try {
      valor = JSON.parse(bruto);
    } catch {
      return { linhas: [], erro: "Filamentos: lista inválida." };
    }
  }
  if (!Array.isArray(valor)) return { linhas: [], erro: "Filamentos: lista inválida." };
  if (valor.length > 20) return { linhas: [], erro: "Filamentos: no máximo 20 por trabalho." };
  const linhas: LinhaTrabalho[] = [];
  const vistos = new Set<string>();
  for (const x of valor) {
    const o = x && typeof x === "object" ? (x as Record<string, unknown>) : {};
    const id = o.material_id;
    const peso = typeof o.peso_estimado_g === "number" ? o.peso_estimado_g : Number.NaN;
    if (typeof id !== "string" || !UUID.test(id)) return { linhas: [], erro: "Filamentos: filamento inválido." };
    if (!Number.isFinite(peso) || peso <= 0) return { linhas: [], erro: "Filamentos: informe um peso maior que zero em cada linha." };
    if (vistos.has(id)) return { linhas: [], erro: "Cada filamento deve aparecer uma vez só." };
    vistos.add(id);
    linhas.push({ material_id: id, peso_estimado_g: peso });
  }
  return { linhas, erro: null };
}

/** Peso estimado do trabalho = soma das linhas (informação de tela e do cadastro do trabalho). */
export function pesoTotalLinhas(linhas: readonly LinhaTrabalho[]): number {
  return arredondar(linhas.reduce((s, l) => s + l.peso_estimado_g, 0), 3);
}
