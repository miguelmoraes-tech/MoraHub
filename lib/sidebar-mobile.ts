/**
 * Regras puras do menu retrátil no celular (sem React, sem DOM): em qual modo a barra lateral aparece
 * por largura, se um gesto de arrastar abre/fecha a gaveta e qual é o título da tela atual para a
 * barra superior. O componente só liga isso a eventos; quem decide é aqui (e é testado).
 */

/** A partir daqui a barra é fixa (como sempre foi); abaixo, vira gaveta. Igual ao breakpoint `lg` do Tailwind. */
export const LARGURA_BARRA_FIXA_PX = 1024;
/** Mesma regra em CSS, para matchMedia. */
export const MEDIA_BARRA_FIXA = `(min-width: ${LARGURA_BARRA_FIXA_PX}px)`;

export type ModoSidebar = "fixa" | "gaveta";

/** Largura da janela → modo da barra lateral. Celular e tablet (< 1024 px) usam a gaveta. */
export function modoSidebar(larguraPx: number): ModoSidebar {
  return larguraPx >= LARGURA_BARRA_FIXA_PX ? "fixa" : "gaveta";
}

/** Largura da gaveta: min(86vw, 320px). */
export function larguraDaGaveta(larguraViewportPx: number): number {
  return Math.min(Math.round(larguraViewportPx * 0.86), 320);
}

// --- Gesto de arrastar -------------------------------------------------------------------------

export interface PontoToque {
  x: number;
  y: number;
  /** Milissegundos (event.timeStamp). */
  t: number;
}

export interface EntradaGesto {
  inicio: PontoToque;
  fim: PontoToque;
  /** A gaveta está aberta? */
  aberto: boolean;
  /** Largura da gaveta em px (para o limiar de 35%). */
  larguraGaveta: number;
  /** O toque começou dentro de algo que rola na horizontal (tabela, abas): o gesto é da rolagem, não do menu. */
  iniciouEmRolavelHorizontal?: boolean;
}

export type DecisaoGesto = "abrir" | "fechar" | "ignorar";

/** Para abrir a partir da borda esquerda: o toque precisa começar nesta faixa. */
export const ZONA_BORDA_PX = 24;
/** Fração da largura da gaveta que o dedo precisa percorrer. */
export const LIMIAR_FRACAO = 0.35;
/** Ou, mais rápido que isto (px/ms = 500 px/s), com um percurso mínimo. */
export const VELOCIDADE_MIN_PX_MS = 0.5;
export const PERCURSO_MIN_PX = 40;

/**
 * Decide o que um gesto horizontal faz:
 * - gaveta fechada: só vale se o toque começou na borda esquerda (24 px) e foi para a DIREITA → "abrir";
 * - gaveta aberta: só vale arrastando para a ESQUERDA → "fechar";
 * - gesto majoritariamente vertical, ou que começou em área rolável na horizontal → "ignorar";
 * - passa o limiar (35% da largura) OU a velocidade (≥ 0,5 px/ms com ≥ 40 px); senão "ignorar".
 */
export function decidirGesto(e: EntradaGesto): DecisaoGesto {
  if (e.iniciouEmRolavelHorizontal) return "ignorar";
  const dx = e.fim.x - e.inicio.x;
  const dy = e.fim.y - e.inicio.y;
  if (Math.abs(dy) > Math.abs(dx)) return "ignorar"; // majoritariamente vertical (rolagem)
  const sentido = e.aberto ? -1 : 1;
  if (e.aberto === false && e.inicio.x > ZONA_BORDA_PX) return "ignorar";
  if (dx * sentido <= 0) return "ignorar";

  const percurso = Math.abs(dx);
  const dt = Math.max(e.fim.t - e.inicio.t, 1);
  const rapido = percurso >= PERCURSO_MIN_PX && percurso / dt >= VELOCIDADE_MIN_PX_MS;
  const longo = percurso >= e.larguraGaveta * LIMIAR_FRACAO;
  if (!longo && !rapido) return "ignorar";
  return e.aberto ? "fechar" : "abrir";
}

/**
 * Deslocamento (translateX, em px, de -largura a 0) da gaveta enquanto o dedo arrasta: acompanha o dedo,
 * sem sair do intervalo. Fechada parte de -largura; aberta parte de 0.
 */
export function deslocamentoGaveta(dx: number, aberto: boolean, larguraGaveta: number): number {
  const base = aberto ? 0 : -larguraGaveta;
  return Math.min(0, Math.max(-larguraGaveta, base + dx));
}

/** Quanto do fundo escurecido mostrar (0 a 1) para um deslocamento da gaveta. */
export function opacidadeDoFundo(deslocamento: number, larguraGaveta: number): number {
  if (larguraGaveta <= 0) return 0;
  return Math.min(1, Math.max(0, 1 + deslocamento / larguraGaveta));
}

// --- Título da barra superior -----------------------------------------------------------------

export const TITULO_PADRAO = "Mora HUB";

/**
 * Título da tela atual: o rótulo do item de menu cujo caminho casa (o mais específico). Rota fora do
 * menu (ex.: /impressao-3d/pedidos/123) usa o item "pai" mais longo; sem nenhum, o título padrão.
 */
export function tituloDaTela(
  pathname: string,
  itens: readonly { href: string; label: string }[],
  padrao: string = TITULO_PADRAO
): string {
  let melhor: { href: string; label: string } | null = null;
  for (const item of itens) {
    const casa = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
    if (casa && (!melhor || item.href.length > melhor.href.length)) melhor = item;
  }
  return melhor?.label ?? padrao;
}
