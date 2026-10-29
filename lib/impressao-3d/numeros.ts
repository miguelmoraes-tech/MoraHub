/**
 * Números do nicho Impressão 3D em pt-BR: exibição (moeda BRL, vírgula) e
 * leitura de campos de formulário (aceita "12,5", "1.234,56" e "12.5").
 */

const DECIMAL = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

/** 1234.5 → "1.234,5" (até `casas` casas, sem zeros à direita). */
export function formatNumero(valor: number, casas = 2): string {
  if (!Number.isFinite(valor)) return "—";
  if (casas === 2) return DECIMAL.format(valor);
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: casas }).format(valor);
}

/** Valor em reais com até 4 casas: custos por grama são frações de centavo. */
export function formatMoeda(valor: number, casas = 2): string {
  if (!Number.isFinite(valor)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(valor);
}

/** 0.2534 → "25,34%" (recebe FRAÇÃO). */
export function formatPercentualFracao(fracao: number, casas = 1): string {
  if (!Number.isFinite(fracao)) return "—";
  return `${formatNumero(fracao * 100, casas)}%`;
}

/** 25.34 → "25,34%" (recebe percentual). */
export function formatPct(pct: number, casas = 2): string {
  if (!Number.isFinite(pct)) return "—";
  return `${formatNumero(pct, casas)}%`;
}

export function formatHoras(horas: number): string {
  return `${formatNumero(horas, 1)} h`;
}

export function formatGramas(g: number): string {
  return `${formatNumero(g, 1)} g`;
}

export function formatDataHora(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

export function formatBytes(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${formatNumero(bytes / 1024, 1)} KB`;
  return `${formatNumero(bytes / (1024 * 1024), 1)} MB`;
}

/**
 * Texto de formulário → número. Vazio/ausente = null; ilegível = NaN (para a
 * validação recusar). Com vírgula, o ponto é separador de milhar ("1.234,5");
 * sem vírgula, o ponto é decimal ("12.5").
 */
export function parseNumero(valor: unknown): number | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : Number.NaN;
  if (typeof valor !== "string") return Number.NaN;
  const t = valor.trim().replace(/\s/g, "").replace(/^R\$/, "");
  if (t === "") return null;
  const normal = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  if (!/^-?\d+(\.\d+)?$/.test(normal)) return Number.NaN;
  return Number(normal);
}
