import type { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/vencimentos/dates";
import type {
  PessoalRecurringExpense,
  PessoalRecurringExpensePayment,
} from "@/lib/pessoal/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const UPCOMING_WINDOW_DAYS = 5;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function currentReferenceMonth(from = todayISO()) {
  const [year, month] = from.split("-");
  return `${year}-${month}-01`;
}

/** Clamps `due_day` to the reference month's last calendar day (e.g. 31 -> 28/29 in Feb). */
export function dueDateForReferenceMonth(
  dueDay: number,
  referenceMonth: string
) {
  const [year, month] = referenceMonth.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(dueDay, lastDay);
  return `${year}-${pad(month)}-${pad(day)}`;
}

export type RecurringDisplayStatus = "pendente" | "proxima" | "atrasada" | "paga";

export const DISPLAY_STATUS_LABEL: Record<RecurringDisplayStatus, string> = {
  pendente: "Pendente",
  proxima: "Vence em breve",
  atrasada: "Atrasada",
  paga: "Paga",
};

export const DISPLAY_STATUS_COLOR: Record<RecurringDisplayStatus, string> = {
  pendente: "#89898d",
  proxima: "#c98500",
  atrasada: "#e66767",
  paga: "#008300",
};

/** UI-only status layer — never persisted. "atrasada"/"proxima" are computed at render time. */
export function computeDisplayStatus(
  paymentStatus: PessoalRecurringExpensePayment["status"],
  dueDay: number,
  referenceMonth: string,
  today = todayISO()
): RecurringDisplayStatus {
  if (paymentStatus === "paga") return "paga";

  const dueDate = dueDateForReferenceMonth(dueDay, referenceMonth);
  if (dueDate < today) return "atrasada";

  const diffDays = Math.round(
    (Date.parse(dueDate) - Date.parse(today)) / 86_400_000
  );
  if (diffDays <= UPCOMING_WINDOW_DAYS) return "proxima";
  return "pendente";
}

/**
 * Idempotent per (recurring_expense_id, reference_month): creates a
 * "pendente" payment row for every active expense that doesn't have one yet
 * this month. Inactive expenses never get a row.
 */
export async function ensureMonthPayments(
  supabase: SupabaseServerClient,
  userId: string,
  expenses: PessoalRecurringExpense[],
  referenceMonth: string
): Promise<PessoalRecurringExpensePayment[]> {
  const { data: existing } = await supabase
    .from("pessoal_recurring_expense_payments")
    .select("*")
    .eq("reference_month", referenceMonth);

  const existingRows = (existing ?? []) as PessoalRecurringExpensePayment[];
  const existingByExpenseId = new Map(
    existingRows.map((payment) => [payment.recurring_expense_id, payment])
  );

  const missing = expenses.filter(
    (expense) => expense.is_active && !existingByExpenseId.has(expense.id)
  );

  if (missing.length === 0) return existingRows;

  const { data: inserted } = await supabase
    .from("pessoal_recurring_expense_payments")
    .insert(
      missing.map((expense) => ({
        user_id: userId,
        recurring_expense_id: expense.id,
        reference_month: referenceMonth,
        status: "pendente",
      }))
    )
    .select("*");

  return [...existingRows, ...((inserted ?? []) as PessoalRecurringExpensePayment[])];
}
