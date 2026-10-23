import type { Reuniao } from "@/lib/types";

/**
 * Pure date/grouping helpers for the agenda views. Everything here works in
 * the *browser's* local timezone (reuniões are timestamptz), so these must
 * only run on the client after mount — the server's timezone would shift
 * days/hours and cause hydration mismatches.
 */

export interface ReuniaoComLead extends Reuniao {
  lead_nome: string;
  /** Display name/e-mail of the vendedor; null when the link was removed. */
  vendedor_nome: string | null;
}

export const MESES = [
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

export const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** YYYY-MM-DD of a Date in local time. */
export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Value for <input type="datetime-local"> (local time, minute precision). */
export function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  return `${localDateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Converts a datetime-local value back to a UTC ISO string; null when empty/invalid. */
export function datetimeLocalToISO(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function formatDataHora(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatHora(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatDiaLongo(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date(y, m - 1, d));
}

export function groupByDay<T extends { data_hora: string }>(
  items: T[]
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = localDateKey(new Date(item.data_hora));
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.data_hora.localeCompare(b.data_hora));
  }
  return map;
}

export interface CalendarCell {
  key: string;
  day: number;
  inMonth: boolean;
}

/** 6-week (or 5-week) Sunday-first grid for the given month (monthIndex0 = 0..11). */
export function buildMonthCells(year: number, monthIndex0: number): CalendarCell[] {
  const first = new Date(year, monthIndex0, 1);
  const start = new Date(year, monthIndex0, 1 - first.getDay());
  const total = new Date(year, monthIndex0 + 1, 0).getDate();
  const weeks = Math.ceil((first.getDay() + total) / 7);
  const cells: CalendarCell[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    cells.push({
      key: localDateKey(d),
      day: d.getDate(),
      inMonth: d.getMonth() === monthIndex0,
    });
  }
  return cells;
}
