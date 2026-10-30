/**
 * Regras puras do estoque de peças (peças impressas prontas). O saldo e o custo médio só mudam pelas
 * RPCs (p3d_movimentar_pecas e as telas de Produção e Pedidos); a tela só mostra o que o banco devolve.
 */
import type { MovimentoPeca, PecaEstoque, TipoPecaNaTela } from "@/lib/impressao-3d/tipos";

/** Abaixo do mínimo: só vale com mínimo > 0 (mínimo 0 = sem alerta). */
export function pecaAbaixoDoMinimo(p: Pick<PecaEstoque, "quantidade" | "estoque_minimo">): boolean {
  return p.estoque_minimo > 0 && p.quantidade <= p.estoque_minimo;
}

export interface NumerosReferencia {
  producao: Record<string, number>;
  pedido: Record<string, number>;
}

/** "Produção #3", "Pedido #12" ou "Manual": a origem de um movimento de peças. */
export function origemMovimentoPeca(
  m: Pick<MovimentoPeca, "tipo" | "referencia_tipo" | "referencia_id">,
  numeros: NumerosReferencia
): string {
  const tipo = m.referencia_tipo ?? "";
  if (m.referencia_id) {
    if (tipo === "producao") {
      const n = numeros.producao[m.referencia_id];
      return n != null ? `Produção #${n}` : "Produção";
    }
    if (tipo === "pedido") {
      const n = numeros.pedido[m.referencia_id];
      return n != null ? `Pedido #${n}` : "Pedido";
    }
  }
  if (m.tipo === "producao") return "Produção";
  if (m.tipo === "venda") return "Pedido";
  return "Manual";
}

export interface MovimentoPecaValidado {
  quantidade: number;
}

/**
 * Quantidade de um lançamento na tela: entrada manual, devolução e perda pedem inteiro POSITIVO;
 * ajuste pede inteiro com sinal (diferente de zero) e observação obrigatória. Saldo negativo é
 * recusado pelo banco (mensagem exibida como veio).
 */
export function validarMovimentoPeca(
  tipo: TipoPecaNaTela,
  quantidade: number | null,
  observacao: string | null
): MovimentoPecaValidado | { error: string } {
  if (quantidade === null || Number.isNaN(quantidade) || !Number.isInteger(quantidade)) {
    return { error: "Quantidade: informe um número inteiro." };
  }
  if (tipo === "ajuste") {
    if (quantidade === 0) return { error: "Quantidade: informe um valor diferente de zero." };
    if (!observacao || !observacao.trim()) return { error: "O ajuste exige uma observação explicando o motivo." };
    return { quantidade };
  }
  if (quantidade <= 0) return { error: "Quantidade: informe um número inteiro maior que zero." };
  return { quantidade };
}

/** Texto do aviso quando uma produção concluída deu entrada em peças. */
export function textoPecasEntraram(quantidade: number): string {
  return `${quantidade} ${quantidade === 1 ? "peça entrou" : "peças entraram"} no estoque de peças.`;
}

// --- Pedidos: baixa e devolução de peças -------------------------------------------------------------

function registro(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);

/** Retorno de p3d_baixar_pecas_pedido. */
export function lerBaixaPecas(json: unknown): { itens_baixados: number; itens_sem_produto_ignorados: number } {
  const r = registro(json);
  return { itens_baixados: num(r.itens_baixados), itens_sem_produto_ignorados: num(r.itens_sem_produto_ignorados) };
}

/** Retorno de p3d_devolver_pecas_pedido. */
export function lerDevolucaoPecas(json: unknown): { itens_devolvidos: number } {
  return { itens_devolvidos: num(registro(json).itens_devolvidos) };
}

/** Chave da linha do estoque de peças de um item de pedido (produto + variação). */
export function chaveEstoquePeca(produtoId: string, variacaoId: string | null): string {
  return `${produtoId}|${variacaoId ?? ""}`;
}

/** Itens do pedido que ainda podem sair do estoque (têm produto e não foram baixados). */
export function itensBaixaveis(itens: readonly { produto_id: string | null; pecas_baixadas_em: string | null }[]): number {
  return itens.filter((i) => i.produto_id && !i.pecas_baixadas_em).length;
}

/** Itens já baixados (podem ser devolvidos). */
export function itensBaixados(itens: readonly { pecas_baixadas_em: string | null }[]): number {
  return itens.filter((i) => i.pecas_baixadas_em).length;
}

/** Mensagem de sucesso da baixa. */
export function textoBaixa(r: { itens_baixados: number; itens_sem_produto_ignorados: number }): string {
  const base = `${r.itens_baixados} ${r.itens_baixados === 1 ? "item baixado" : "itens baixados"} do estoque de peças.`;
  return r.itens_sem_produto_ignorados > 0
    ? `${base} ${r.itens_sem_produto_ignorados} ${r.itens_sem_produto_ignorados === 1 ? "item sem produto foi ignorado" : "itens sem produto foram ignorados"}.`
    : base;
}
