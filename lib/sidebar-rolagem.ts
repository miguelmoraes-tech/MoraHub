/**
 * Posição de rolagem da barra lateral, guardada em sessionStorage para não voltar ao topo se a barra
 * remontar (recarga, troca de modo). Puro: recebe o storage, nunca lança (storage bloqueado = sem posição).
 */
export const CHAVE_ROLAGEM_SIDEBAR = "hub:sidebar-scroll";

interface ArmazenamentoSimples {
  getItem(chave: string): string | null;
  setItem(chave: string, valor: string): void;
}

/** Posição guardada (px, inteiro ≥ 0); qualquer falha ou valor torto = 0. */
export function lerRolagem(storage: ArmazenamentoSimples | null | undefined): number {
  try {
    const bruto = storage?.getItem(CHAVE_ROLAGEM_SIDEBAR);
    if (bruto == null) return 0;
    const n = Number(bruto);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
  } catch {
    return 0;
  }
}

export function gravarRolagem(storage: ArmazenamentoSimples | null | undefined, posicao: number): void {
  try {
    if (Number.isFinite(posicao) && posicao >= 0) storage?.setItem(CHAVE_ROLAGEM_SIDEBAR, String(Math.round(posicao)));
  } catch {
    // Storage bloqueado ou cheio: a posição só não persiste.
  }
}
