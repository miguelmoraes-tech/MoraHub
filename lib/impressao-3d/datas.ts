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

// --- Aritmética de datas YYYY-MM-DD (sem fuso: opera sobre o calendário) ----------------------
// Formata campo a campo: converter para ISO devolveria a data em UTC e adiantaria o dia à noite.

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

function doIso(iso: string): Date | null {
  const m = ISO.exec(iso);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  // Rejeita 2026-02-31 (o Date "rola" para março).
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3])
    ? d
    : null;
}

function paraIso(d: Date): string {
  const p = (n: number, t = 2) => String(n).padStart(t, "0");
  return `${p(d.getUTCFullYear(), 4)}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

/** True para uma data de calendário real no formato YYYY-MM-DD. */
export function dataIsoValida(iso: unknown): iso is string {
  return typeof iso === "string" && doIso(iso) !== null;
}

export function adicionarDias(iso: string, dias: number): string {
  const d = doIso(iso);
  if (!d) throw new Error(`Data inválida: ${iso}`);
  d.setUTCDate(d.getUTCDate() + dias);
  return paraIso(d);
}

/** Dias entre duas datas (ate − de). Negativo se `ate` vier antes. */
export function diasEntre(de: string, ate: string): number {
  const a = doIso(de);
  const b = doIso(ate);
  if (!a || !b) throw new Error("Data inválida.");
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function primeiroDiaDoMes(iso: string): string {
  const d = doIso(iso);
  if (!d) throw new Error(`Data inválida: ${iso}`);
  d.setUTCDate(1);
  return paraIso(d);
}

export function ultimoDiaDoMes(iso: string): string {
  const d = doIso(iso);
  if (!d) throw new Error(`Data inválida: ${iso}`);
  return paraIso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
}

/** 2026-03-09 → "09/03/2026". */
export function formatDataIso(iso: string): string {
  const m = ISO.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}
