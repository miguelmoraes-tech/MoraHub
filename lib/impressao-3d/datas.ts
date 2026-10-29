/**
 * Datas do nicho Impressão 3D no fuso da empresa (America/Sao_Paulo). `new Date().toISOString()`
 * devolve a data em UTC e adianta o dia a partir das 21h de Brasília; os alertas de prazo usam esta.
 */
const FUSO_NICHO = "America/Sao_Paulo";

const FORMATO = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO_NICHO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Data de hoje (YYYY-MM-DD) em America/Sao_Paulo. `agora` existe para teste. */
export function hojeSaoPaulo(agora: Date = new Date()): string {
  return FORMATO.format(agora);
}
