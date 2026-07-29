import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Repeat,
  ListChecks,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/stat-card";
import { StatusChip } from "@/components/status-chip";
import { formatCurrency, formatDate } from "@/lib/format";
import { computeEstimatedBalancesByAccount, sumEstimatedBalances } from "@/lib/pessoal/balance";
import { currentMonthFilter, monthRange } from "@/lib/pessoal/period";
import {
  currentReferenceMonth,
  ensureMonthPayments,
  computeDisplayStatus,
  DISPLAY_STATUS_LABEL,
} from "@/lib/pessoal/recurring";
import { TASK_PRIORITIES } from "@/lib/pessoal/categories";
import type {
  PessoalAccount,
  PessoalRecurringExpense,
  PessoalTask,
  PessoalTransaction,
} from "@/lib/pessoal/types";

const STATUS_TONE = {
  pendente: "zinc",
  proxima: "amber",
  atrasada: "rose",
  paga: "emerald",
} as const;

export default async function PessoalDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: contas },
    { data: transacoes },
    { data: expenses },
    { data: tarefas },
  ] = (await Promise.all([
    supabase.from("pessoal_accounts").select("*"),
    supabase.from("pessoal_transactions").select("*"),
    supabase.from("pessoal_recurring_expenses").select("*").eq("is_active", true),
    supabase
      .from("pessoal_tasks")
      .select("*")
      .eq("status", "pendente")
      .order("due_date", { ascending: true, nullsFirst: false }),
  ])) as [
    { data: PessoalAccount[] | null },
    { data: PessoalTransaction[] | null },
    { data: PessoalRecurringExpense[] | null },
    { data: PessoalTask[] | null },
  ];

  const contasList = contas ?? [];
  const transacoesList = transacoes ?? [];
  const expensesList = expenses ?? [];
  const tarefasList = tarefas ?? [];

  const saldoTotal = sumEstimatedBalances(
    computeEstimatedBalancesByAccount(contasList, transacoesList)
  );

  const monthFilter = currentMonthFilter();
  const { start, end } =
    monthFilter.mode === "month"
      ? monthRange(monthFilter.year, monthFilter.month)
      : { start: "", end: "" };
  const doMes = transacoesList.filter(
    (t) => t.transaction_date >= start && t.transaction_date <= end
  );
  const receitasMes = doMes
    .filter((t) => t.type === "receita")
    .reduce((sum, t) => sum + t.amount, 0);
  const despesasMes = doMes
    .filter((t) => t.type === "despesa")
    .reduce((sum, t) => sum + t.amount, 0);

  const referenceMonth = currentReferenceMonth();
  const payments = user
    ? await ensureMonthPayments(supabase, user.id, expensesList, referenceMonth)
    : [];
  const paymentByExpenseId = new Map(
    payments.map((p) => [p.recurring_expense_id, p])
  );
  const proximosRecorrentes = expensesList
    .map((expense) => {
      const payment = paymentByExpenseId.get(expense.id);
      const status = payment
        ? computeDisplayStatus(payment.status, expense.due_day, referenceMonth)
        : "pendente";
      return { expense, status };
    })
    .filter(({ status }) => status === "proxima" || status === "atrasada")
    .sort((a, b) => Number(a.status !== "atrasada") - Number(b.status !== "atrasada"));

  const tarefasDestaque = tarefasList.slice(0, 5);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Visão Geral</h1>
        <p className="text-sm text-zinc-500">Resumo das suas finanças e organização pessoal</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Wallet}
          label="Saldo total estimado"
          value={formatCurrency(saldoTotal)}
          tone="zinc"
        />
        <StatCard
          icon={TrendingUp}
          label="Receitas do mês"
          value={formatCurrency(receitasMes)}
          tone="emerald"
        />
        <StatCard
          icon={TrendingDown}
          label="Despesas do mês"
          value={formatCurrency(despesasMes)}
          tone="rose"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
              <Repeat className="h-4 w-4 text-zinc-500" />
              Gastos recorrentes a vencer
            </h2>
            <Link
              href="/pessoal/recorrentes"
              className="text-xs font-medium text-petrol-400 hover:text-petrol-300"
            >
              Ver todos
            </Link>
          </div>
          {proximosRecorrentes.length > 0 ? (
            <div className="space-y-2">
              {proximosRecorrentes.map(({ expense, status }) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-zinc-200">{expense.name}</p>
                    <p className="text-xs text-zinc-500">
                      {formatCurrency(expense.amount)} · dia {expense.due_day}
                    </p>
                  </div>
                  <StatusChip tone={STATUS_TONE[status]}>
                    {DISPLAY_STATUS_LABEL[status]}
                  </StatusChip>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-600">
              Nenhum gasto recorrente vencendo em breve.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
              <ListChecks className="h-4 w-4 text-zinc-500" />
              Tarefas pendentes
            </h2>
            <Link
              href="/pessoal/tarefas"
              className="text-xs font-medium text-petrol-400 hover:text-petrol-300"
            >
              Ver todas
            </Link>
          </div>
          {tarefasDestaque.length > 0 ? (
            <div className="space-y-2">
              {tarefasDestaque.map((tarefa) => {
                const prioridade = TASK_PRIORITIES.find((p) => p.value === tarefa.priority);
                return (
                  <div
                    key={tarefa.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5"
                  >
                    <p className="truncate text-sm text-zinc-200">{tarefa.title}</p>
                    <div className="flex shrink-0 items-center gap-2">
                      {tarefa.due_date && (
                        <span className="text-xs text-zinc-500">
                          {formatDate(tarefa.due_date)}
                        </span>
                      )}
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: prioridade?.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-zinc-600">Nenhuma tarefa pendente.</p>
          )}
        </div>
      </div>
    </div>
  );
}
