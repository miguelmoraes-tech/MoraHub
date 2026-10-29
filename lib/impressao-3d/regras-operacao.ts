/**
 * Regras puras da Etapa B (sem banco, sem React): testadas em
 * scripts/testar-acesso.mts. Quem decide é sempre o banco (as RPCs conferem de
 * novo); aqui só se evita oferecer uma ação que a RPC vai recusar e se calculam
 * indicadores de EXIBIÇÃO a partir de dados reais.
 */
import type {
  Falha,
  Pedido,
  Prioridade,
  ResultadoConclusao,
  ResultadoFalha,
  ResultadoInicio,
  ResultadoPagamento,
  ResultadoRecebimento,
  StatusCompra,
  StatusEnvio,
  StatusPedido,
  StatusProducao,
  Trabalho,
} from "@/lib/impressao-3d/tipos-operacao";

// --- Transições de status (espelham as RPCs) ------------------------------------

export interface AcaoStatus {
  alvo: string;
  rotulo: string;
  /** Texto de confirmação antes de executar. */
  confirmar?: string;
  /** A RPC exige um motivo (cancelamentos). */
  pedeMotivo?: boolean;
  perigo?: boolean;
}

export const ACOES_COMPRA: Record<StatusCompra, AcaoStatus[]> = {
  cotacao: [
    { alvo: "aprovada", rotulo: "Aprovar" },
    { alvo: "cancelada", rotulo: "Cancelar", confirmar: "Cancelar esta cotação? Compra cancelada não pode mais ser alterada.", perigo: true },
  ],
  aprovada: [
    { alvo: "cotacao", rotulo: "Voltar para cotação" },
    { alvo: "cancelada", rotulo: "Cancelar", confirmar: "Cancelar esta compra? Compra cancelada não pode mais ser alterada.", perigo: true },
  ],
  // O recebimento é uma ação à parte (p3d_receber_compra); recebida e cancelada são finais.
  recebida: [],
  cancelada: [],
};

export const ACOES_PEDIDO: Record<StatusPedido, AcaoStatus[]> = {
  novo: [
    { alvo: "confirmado", rotulo: "Confirmar pedido" },
    { alvo: "cancelado", rotulo: "Cancelar pedido", pedeMotivo: true, perigo: true },
  ],
  confirmado: [
    { alvo: "em_producao", rotulo: "Iniciar produção" },
    { alvo: "pronto", rotulo: "Marcar como pronto" },
    { alvo: "cancelado", rotulo: "Cancelar pedido", pedeMotivo: true, perigo: true },
  ],
  em_producao: [
    { alvo: "pronto", rotulo: "Marcar como pronto" },
    { alvo: "cancelado", rotulo: "Cancelar pedido", pedeMotivo: true, perigo: true },
  ],
  pronto: [
    { alvo: "enviado", rotulo: "Marcar como enviado" },
    { alvo: "entregue", rotulo: "Marcar como entregue" },
    { alvo: "em_producao", rotulo: "Voltar para produção" },
    { alvo: "cancelado", rotulo: "Cancelar pedido", pedeMotivo: true, perigo: true },
  ],
  enviado: [{ alvo: "entregue", rotulo: "Marcar como entregue" }],
  entregue: [],
  cancelado: [],
};

export const ACOES_ENVIO: Record<StatusEnvio, AcaoStatus[]> = {
  preparando: [{ alvo: "postado", rotulo: "Marcar como postado" }],
  postado: [
    { alvo: "em_transito", rotulo: "Em trânsito" },
    { alvo: "entregue", rotulo: "Entregue" },
    { alvo: "problema", rotulo: "Problema" },
    { alvo: "devolvido", rotulo: "Devolvido" },
  ],
  em_transito: [
    { alvo: "entregue", rotulo: "Entregue" },
    { alvo: "problema", rotulo: "Problema" },
    { alvo: "devolvido", rotulo: "Devolvido" },
  ],
  problema: [
    { alvo: "em_transito", rotulo: "Voltou a transitar" },
    { alvo: "entregue", rotulo: "Entregue" },
    { alvo: "devolvido", rotulo: "Devolvido" },
  ],
  entregue: [],
  devolvido: [],
};

/** Pedido ainda aceita edição de cliente, desconto e frete (antes da produção). */
export function pedidoEditavel(status: StatusPedido): boolean {
  return status === "novo" || status === "confirmado";
}

/** Itens manuais só se editam em pedido novo/confirmado. */
export const itemPedidoEditavel = pedidoEditavel;

/** Pedido que pode receber trabalhos de produção. */
export function podeGerarProducao(status: StatusPedido): boolean {
  return status === "confirmado" || status === "em_producao";
}

/** Pedido que aceita registro de pagamento (não cancelado). */
export function aceitaPagamento(p: Pick<Pedido, "status">): boolean {
  return p.status !== "cancelado";
}

/** Excluir só pedido novo, sem pagamento e que não veio de orçamento. */
export function podeExcluirPedido(p: Pick<Pedido, "status" | "pago_valor" | "orcamento_id" | "origem">): boolean {
  return p.status === "novo" && !(p.pago_valor > 0) && !p.orcamento_id && p.origem !== "orcamento";
}

/** Compra só é excluída em cotação. */
export function podeExcluirCompra(status: StatusCompra): boolean {
  return status === "cotacao";
}

/** Itens da compra só se editam em cotação ou aprovada. */
export function compraEditavel(status: StatusCompra): boolean {
  return status === "cotacao" || status === "aprovada";
}

/** Envio só se exclui em preparação. */
export function podeExcluirEnvio(status: StatusEnvio): boolean {
  return status === "preparando";
}

/** Pedido que aceita criação de envio (pronto ou enviado). */
export function pedidoAceitaEnvio(status: StatusPedido): boolean {
  return status === "pronto" || status === "enviado";
}

/** Trabalho: campos estruturais só na fila; depois só prioridade, prazo e observações. */
export function trabalhoEstruturalEditavel(status: StatusProducao): boolean {
  return status === "fila";
}

// --- Pedidos: prazo e saldo -------------------------------------------------------

/** Pedido ainda "aberto" para o alerta de prazo: não saiu da empresa nem foi cancelado. */
export function pedidoEmAberto(status: StatusPedido): boolean {
  return status === "novo" || status === "confirmado" || status === "em_producao" || status === "pronto";
}

export function prazoVencido(
  p: Pick<Pedido, "status" | "prazo_entrega">,
  hoje: string
): boolean {
  return !!p.prazo_entrega && p.prazo_entrega < hoje && pedidoEmAberto(p.status);
}

/** Saldo a receber (nunca negativo na exibição). */
export function saldoPedido(total: number, pago: number): number {
  return Math.max(0, Math.round((total - pago) * 100) / 100);
}

/** total = subtotal − desconto + frete (o banco calcula; a tela só confere a exibição). */
export function totalDoPedido(subtotal: number, desconto: number, frete: number): number {
  return Math.round((subtotal - desconto + frete) * 100) / 100;
}

// --- Fila de produção ---------------------------------------------------------------

const PESO_PRIORIDADE: Record<Prioridade, number> = { urgente: 0, alta: 1, normal: 2, baixa: 3 };

/** Ordem da fila: prioridade (urgente > alta > normal > baixa), prazo (nulos por último), número. */
export function compararFila(a: Pick<Trabalho, "prioridade" | "prazo" | "numero">, b: Pick<Trabalho, "prioridade" | "prazo" | "numero">): number {
  const pa = PESO_PRIORIDADE[a.prioridade] ?? 9;
  const pb = PESO_PRIORIDADE[b.prioridade] ?? 9;
  if (pa !== pb) return pa - pb;
  if (a.prazo !== b.prazo) {
    if (a.prazo === null) return 1;
    if (b.prazo === null) return -1;
    return a.prazo < b.prazo ? -1 : 1;
  }
  return a.numero - b.numero;
}

export function ordenarFila<T extends Pick<Trabalho, "prioridade" | "prazo" | "numero">>(trabalhos: readonly T[]): T[] {
  return [...trabalhos].sort(compararFila);
}

/** Trabalhos urgentes ainda na fila (alerta do painel). */
export function urgentesNaFila(trabalhos: readonly Pick<Trabalho, "status" | "prioridade">[]): number {
  return trabalhos.filter((t) => t.status === "fila" && t.prioridade === "urgente").length;
}

// --- Avisos devolvidos pelas RPCs ------------------------------------------------------

function registro(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);
const txt = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

export function lerInicio(json: unknown): ResultadoInicio {
  const r = registro(json);
  return { impressora: txt(r.impressora), aviso: txt(r.aviso) };
}

export function lerConclusao(json: unknown): ResultadoConclusao {
  const r = registro(json);
  return {
    saldo: r.saldo === null || r.saldo === undefined ? null : num(r.saldo),
    estoque_negativo: r.estoque_negativo === true,
    abaixo_do_minimo: r.abaixo_do_minimo === true,
    manutencao_devida: r.manutencao_devida === true,
  };
}

export function lerFalha(json: unknown): ResultadoFalha {
  const r = registro(json);
  return {
    falha_id: txt(r.falha_id) ?? "",
    reimpressao_id: txt(r.reimpressao_id),
    baixou_estoque: r.baixou_estoque === true,
    custo_material: num(r.custo_material),
    custo_maquina_estimado: num(r.custo_maquina_estimado),
    estoque_negativo: r.estoque_negativo === true,
  };
}

export function lerPagamento(json: unknown): ResultadoPagamento {
  const r = registro(json);
  const st = r.status_pagamento;
  return {
    pagamento_id: txt(r.pagamento_id) ?? "",
    pago_valor: num(r.pago_valor),
    saldo: num(r.saldo),
    status_pagamento: st === "pago" || st === "parcial" ? st : "pendente",
    conta_receber_id: txt(r.conta_receber_id),
  };
}

export function lerRecebimento(json: unknown): ResultadoRecebimento {
  const r = registro(json);
  return { itens_recebidos: num(r.itens_recebidos), total: num(r.total), conta_pagar_id: txt(r.conta_pagar_id) };
}

/** Avisos (texto) de uma conclusão de trabalho, para o usuário ler no toast/painel. */
export function avisosConclusao(r: ResultadoConclusao, saldoFmt: (n: number) => string): string[] {
  const out: string[] = [];
  if (r.estoque_negativo) out.push("O estoque do material ficou NEGATIVO: confira as entradas e o consumo informado.");
  else if (r.abaixo_do_minimo) out.push("O material está abaixo do estoque mínimo. Considere repor.");
  if (r.manutencao_devida) out.push("A impressora atingiu o intervalo de manutenção. Registre a manutenção em Impressoras.");
  if (r.saldo !== null && !r.estoque_negativo) out.push(`Saldo do material após a baixa: ${saldoFmt(r.saldo)}.`);
  return out;
}

// --- Indicadores de qualidade (dados reais; nada estimado aqui) --------------------------

export interface DadosTaxa {
  concluidos: number;
  falhos: number;
  /** Trabalhos distintos com pelo menos uma falha registrada. */
  trabalhosComFalha: number;
}

/**
 * Taxa real de falha = trabalhos com falha ÷ (trabalhos concluídos + falhos).
 * Retorna null sem base (nenhum trabalho concluído/falho): a tela mostra "sem dados",
 * nunca zero inventado. Falha parcial em trabalho concluído conta no numerador e o
 * trabalho continua no denominador (concluído); reimpressões são trabalhos próprios.
 */
export function taxaFalhaReal(d: DadosTaxa): number | null {
  const base = d.concluidos + d.falhos;
  if (base <= 0) return null;
  return Math.min(1, d.trabalhosComFalha / base);
}

export interface GrupoIndicador {
  chave: string;
  concluidos: number;
  falhos: number;
  trabalhosComFalha: number;
  falhas: number;
  pesoPerdidoG: number;
  horasPerdidas: number;
}

type TrabalhoBase = Pick<Trabalho, "id" | "status" | "impressora_id" | "material_id" | "produto_id">;
type FalhaBase = Pick<Falha, "producao_id" | "tipo_defeito" | "impressora_id" | "material_id" | "produto_id" | "peso_perdido_g" | "horas_perdidas">;

/**
 * Agrupa trabalhos (concluídos/falhos) e falhas por uma dimensão. A falha usa o
 * valor da própria linha de p3d_falhas; se ele vier nulo, cai no do trabalho.
 */
export function agruparIndicadores(
  trabalhos: readonly TrabalhoBase[],
  falhas: readonly FalhaBase[],
  dimensao: "impressora_id" | "material_id" | "produto_id"
): GrupoIndicador[] {
  const mapa = new Map<string, GrupoIndicador & { comFalha: Set<string> }>();
  const porId = new Map(trabalhos.map((t) => [t.id, t]));
  const pegar = (chave: string) => {
    let g = mapa.get(chave);
    if (!g) {
      g = { chave, concluidos: 0, falhos: 0, trabalhosComFalha: 0, falhas: 0, pesoPerdidoG: 0, horasPerdidas: 0, comFalha: new Set() };
      mapa.set(chave, g);
    }
    return g;
  };
  for (const t of trabalhos) {
    if (t.status !== "concluida" && t.status !== "falhou") continue;
    const g = pegar(t[dimensao] ?? "");
    if (t.status === "concluida") g.concluidos++;
    else g.falhos++;
  }
  for (const f of falhas) {
    const g = pegar(f[dimensao] ?? porId.get(f.producao_id)?.[dimensao] ?? "");
    g.falhas++;
    g.pesoPerdidoG += f.peso_perdido_g;
    g.horasPerdidas += f.horas_perdidas;
    g.comFalha.add(f.producao_id);
  }
  return [...mapa.values()]
    .map((g) => ({
      chave: g.chave, concluidos: g.concluidos, falhos: g.falhos, falhas: g.falhas,
      pesoPerdidoG: g.pesoPerdidoG, horasPerdidas: g.horasPerdidas, trabalhosComFalha: g.comFalha.size,
    }))
    .sort((a, b) => b.falhas - a.falhas);
}

export interface PorDefeito {
  tipo: string;
  falhas: number;
  pesoPerdidoG: number;
}

export function agruparPorDefeito(falhas: readonly Pick<Falha, "tipo_defeito" | "peso_perdido_g">[]): PorDefeito[] {
  const mapa = new Map<string, PorDefeito>();
  for (const f of falhas) {
    const g = mapa.get(f.tipo_defeito) ?? { tipo: f.tipo_defeito, falhas: 0, pesoPerdidoG: 0 };
    g.falhas++;
    g.pesoPerdidoG += f.peso_perdido_g;
    mapa.set(f.tipo_defeito, g);
  }
  return [...mapa.values()].sort((a, b) => b.falhas - a.falhas);
}

export interface DesperdicioFalhas {
  /** Falhas que baixaram estoque: material perdido ADICIONAL ao consumo dos trabalhos concluídos. */
  adicionalG: number;
  adicionalCusto: number;
  /** Falhas em trabalho já concluído (baixou_estoque=false): o material já está no consumo do trabalho. */
  jaContidoG: number;
  jaContidoCusto: number;
  horasPerdidas: number;
  custoMaquina: number;
}

/**
 * Desperdício sem contar duas vezes: o custo_material de uma falha com
 * baixou_estoque=false já está dentro do consumo do trabalho concluído, então
 * ele NÃO soma ao desperdício adicional; só aparece à parte, como "já contido".
 */
export function resumirDesperdicio(
  falhas: readonly Pick<Falha, "baixou_estoque" | "peso_perdido_g" | "custo_material" | "horas_perdidas" | "custo_maquina_estimado">[]
): DesperdicioFalhas {
  const r: DesperdicioFalhas = { adicionalG: 0, adicionalCusto: 0, jaContidoG: 0, jaContidoCusto: 0, horasPerdidas: 0, custoMaquina: 0 };
  for (const f of falhas) {
    if (f.baixou_estoque) {
      r.adicionalG += f.peso_perdido_g;
      r.adicionalCusto += f.custo_material;
    } else {
      r.jaContidoG += f.peso_perdido_g;
      r.jaContidoCusto += f.custo_material;
    }
    r.horasPerdidas += f.horas_perdidas;
    r.custoMaquina += f.custo_maquina_estimado;
  }
  return r;
}

// --- Produtividade por impressora (dados reais) -------------------------------------------

export interface ProdutividadeImpressora {
  impressoraId: string;
  concluidos: number;
  falhos: number;
  horasReais: number;
  pesoRealG: number;
  /** Trabalhos concluídos por hora real de impressão; null sem horas medidas. */
  trabalhosPorHora: number | null;
}

export function produtividadePorImpressora(
  trabalhos: readonly Pick<Trabalho, "status" | "impressora_id" | "horas_reais" | "peso_real_g">[]
): Map<string, ProdutividadeImpressora> {
  const mapa = new Map<string, ProdutividadeImpressora>();
  for (const t of trabalhos) {
    if (!t.impressora_id) continue;
    if (t.status !== "concluida" && t.status !== "falhou") continue;
    const p = mapa.get(t.impressora_id) ?? {
      impressoraId: t.impressora_id, concluidos: 0, falhos: 0, horasReais: 0, pesoRealG: 0, trabalhosPorHora: null,
    };
    if (t.status === "concluida") p.concluidos++;
    else p.falhos++;
    p.horasReais += t.horas_reais ?? 0;
    p.pesoRealG += t.peso_real_g ?? 0;
    mapa.set(t.impressora_id, p);
  }
  for (const p of mapa.values()) p.trabalhosPorHora = p.horasReais > 0 ? p.concluidos / p.horasReais : null;
  return mapa;
}

// --- Compras: histórico e comparação de preços --------------------------------------------------

export interface LinhaPreco {
  material_id: string | null;
  fornecedor_id: string | null;
  compra_id: string | null;
  compra_numero: number | null;
  compra_status: string | null;
  data: string | null;
  quantidade: number | null;
  preco_unitario: number | null;
  preco_total: number | null;
}

/** Cotações abertas (status "cotacao") de um material, da mais barata para a mais cara. */
export function cotacoesAbertas<T extends LinhaPreco>(linhas: readonly T[], materialId: string): T[] {
  return linhas
    .filter((l) => l.material_id === materialId && l.compra_status === "cotacao" && l.preco_unitario !== null)
    .sort((a, b) => (a.preco_unitario ?? 0) - (b.preco_unitario ?? 0));
}

/** Histórico real de um material (compras recebidas), do mais recente ao mais antigo. */
export function historicoRecebido<T extends LinhaPreco>(linhas: readonly T[], materialId: string): T[] {
  return linhas
    .filter((l) => l.material_id === materialId && l.compra_status === "recebida")
    .sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""));
}

/**
 * Quantidade de uma compra na unidade BASE do material (g/ml/un): "rolos × peso
 * líquido" quando o material tem peso de rolo; senão a quantidade já é a base.
 */
export function quantidadeBaseDeRolos(rolos: number, pesoLiquidoRoloG: number | null): number | null {
  if (!(rolos > 0) || pesoLiquidoRoloG === null || !(pesoLiquidoRoloG > 0)) return null;
  return rolos * pesoLiquidoRoloG;
}

/** Preço por unidade base (g/ml/un); sem frete. null sem quantidade. */
export function precoUnitarioBase(precoTotal: number, quantidade: number): number | null {
  return quantidade > 0 ? precoTotal / quantidade : null;
}

/** Subtotal exibido = Σ preco_total dos itens (o banco recalcula; isto só confere a tela). */
export function totalDaCompra(subtotal: number, frete: number, desconto: number): number {
  return Math.round((subtotal + frete - desconto) * 100) / 100;
}

/** Conta a pagar exige vencimento (e Financeiro ligado + edição). */
export function validarOpcoesRecebimento(gerarConta: boolean, vencimento: string | null): string | null {
  if (gerarConta && !vencimento) return "Informe o vencimento para gerar a conta a pagar.";
  return null;
}
