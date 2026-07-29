import { todayISO } from "@/lib/vencimentos/dates";

export type PeriodFilter =
  | { mode: "month"; year: number; month: number } // month is 1-indexed
  | { mode: "custom"; start: string; end: string };

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function monthRange(year: number, month: number) {
  const start = `${year}-${pad(month)}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const end = `${year}-${pad(month)}-${pad(lastDay)}`;
  return { start, end };
}

export function shiftMonth(year: number, month: number, delta: number) {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export function currentMonthFilter(): PeriodFilter {
  const [year, month] = todayISO().split("-").map(Number);
  return { mode: "month", year, month };
}

export function periodToRange(filter: PeriodFilter) {
  if (filter.mode === "custom") return { start: filter.start, end: filter.end };
  return monthRange(filter.year, filter.month);
}

/** Last `n` months including the month of `from`, ascending (oldest first). */
export function lastNMonths(n: number, from = todayISO()) {
  const [year, month] = from.split("-").map(Number);
  const months: { year: number; month: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    months.push(shiftMonth(year, month, -i));
  }
  return months;
}

export function monthLabel(year: number, month: number) {
  const MESES = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  return `${MESES[month - 1]} de ${year}`;
}
