export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseISODate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return { y, m: m - 1, d };
}

function daysInMonth(year: number, monthIndex0: number) {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

function toISO(year: number, monthIndex0: number, day: number) {
  const clampedDay = Math.min(day, daysInMonth(year, monthIndex0));
  const mm = String(monthIndex0 + 1).padStart(2, "0");
  const dd = String(clampedDay).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/** Whole days between two YYYY-MM-DD strings (to - from). Can be negative. */
export function diffInDays(fromISO: string, toISOValue: string): number {
  const from = parseISODate(fromISO);
  const to = parseISODate(toISOValue);
  const fromMs = Date.UTC(from.y, from.m, from.d);
  const toMs = Date.UTC(to.y, to.m, to.d);
  return Math.round((toMs - fromMs) / 86_400_000);
}

/**
 * Next occurrence (on or after `todayISOValue`) of a recurring date whose
 * day-of-month (Mensal) or day-and-month (Anual) is taken from `referenceISO`.
 * Overflow days (e.g. day 31 in a 30-day month) clamp to the month's last day.
 */
export function nextOccurrence(
  referenceISO: string,
  recorrencia: "Mensal" | "Anual",
  todayISOValue: string
): string {
  const ref = parseISODate(referenceISO);
  const today = parseISODate(todayISOValue);

  if (recorrencia === "Mensal") {
    const candidateThisMonth = toISO(today.y, today.m, ref.d);
    if (candidateThisMonth >= todayISOValue) return candidateThisMonth;

    const nextMonthIndex = today.m + 1;
    const nextYear = today.y + Math.floor(nextMonthIndex / 12);
    const nextMonth = nextMonthIndex % 12;
    return toISO(nextYear, nextMonth, ref.d);
  }

  const candidateThisYear = toISO(today.y, ref.m, ref.d);
  if (candidateThisYear >= todayISOValue) return candidateThisYear;
  return toISO(today.y + 1, ref.m, ref.d);
}

function ymKey(iso: string) {
  return iso.slice(0, 7);
}

function ymToIndex(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return y * 12 + (m - 1);
}

/**
 * Which of `windowMonthKeys` (each "YYYY-MM") a recurring item lands in,
 * given its reference date and recurrence. "Único" (or a missing/unrecognized
 * recorrencia) yields at most the single month the reference date falls in;
 * "Mensal"/"Anual" step forward from the reference month indefinitely.
 */
export function recurringMonthKeysInWindow(
  referenceISO: string | null,
  recorrencia: "Mensal" | "Anual" | "Único" | null,
  windowMonthKeys: string[]
): string[] {
  if (!referenceISO) return [];
  const refIndex = ymToIndex(ymKey(referenceISO));
  const step = recorrencia === "Mensal" ? 1 : recorrencia === "Anual" ? 12 : null;

  if (step === null) {
    const key = ymKey(referenceISO);
    return windowMonthKeys.includes(key) ? [key] : [];
  }

  return windowMonthKeys.filter((key) => {
    const index = ymToIndex(key);
    return index >= refIndex && (index - refIndex) % step === 0;
  });
}
