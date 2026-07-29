"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Repeat, Plus, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import type {
  PessoalAccount,
  PessoalCategory,
  PessoalRecurringExpense,
  PessoalRecurringExpensePayment,
} from "@/lib/pessoal/types";
import {
  computeDisplayStatus,
  DISPLAY_STATUS_LABEL,
  type RecurringDisplayStatus,
} from "@/lib/pessoal/recurring";
import {
  createPessoalRecorrente,
  updatePessoalRecorrente,
  deletePessoalRecorrente,
  markPessoalRecorrentePaga,
} from "@/app/(dashboard)/pessoal/recorrentes/actions";
import { formatCurrency } from "@/lib/format";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { StatusChip, type ChipTone } from "@/components/status-chip";

const STATUS_TONE: Record<RecurringDisplayStatus, ChipTone> = {
  pendente: "zinc",
  proxima: "amber",
  atrasada: "rose",
  paga: "emerald",
};

function RecorrenteFields({
  expense,
  contas,
  categorias,
}: {
  expense?: PessoalRecurringExpense;
  contas: PessoalAccount[];
  categorias: PessoalCategory[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">Nome *</label>
        <input
          name="name"
          required
          defaultValue={expense?.name}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Valor *</label>
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={expense?.amount}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Dia venc. *</label>
        <input
          name="due_day"
          type="number"
          min="1"
          max="31"
          required
          defaultValue={expense?.due_day}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Conta</label>
        <select
          name="account_id"
          defaultValue={expense?.account_id ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        >
          <option value="">Nenhuma</option>
          {contas.map((conta) => (
            <option key={conta.id} value={conta.id}>
              {conta.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Categoria</label>
        <select
          name="category_id"
          defaultValue={expense?.category_id ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        >
          <option value="">Nenhuma</option>
          {categorias
            .filter((c) => c.kind === "despesa")
            .map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.name}
              </option>
            ))}
        </select>
      </div>
      <div className="flex items-end gap-1.5 pb-2">
        <input
          id="is_active"
          name="is_active"
          type="checkbox"
          defaultChecked={expense?.is_active ?? true}
          className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-950 accent-petrol-500"
        />
        <label htmlFor="is_active" className="text-xs text-zinc-400">
          Ativo
        </label>
      </div>
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">Notas</label>
        <input
          name="notes"
          defaultValue={expense?.notes ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        />
      </div>
    </div>
  );
}

function NewRecorrenteForm({
  contas,
  categorias,
}: {
  contas: PessoalAccount[];
  categorias: PessoalCategory[];
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createPessoalRecorrente,
    undefined
  );

  useActionSuccess(state, () => setOpen(false));

  useEffect(() => {
    if (!open) formRef.current?.reset();
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-petrol-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-petrol-500"
      >
        <Plus className="h-4 w-4" />
        Novo gasto recorrente
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <RecorrenteFields contas={contas} categorias={categorias} />
      {state && "error" in state && (
        <p className="text-xs text-rose-400">{state.error}</p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-petrol-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-petrol-500 disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}

function RecorrenteRow({
  expense,
  payment,
  referenceMonth,
  contas,
  categorias,
}: {
  expense: PessoalRecurringExpense;
  payment: PessoalRecurringExpensePayment | undefined;
  referenceMonth: string;
  contas: PessoalAccount[];
  categorias: PessoalCategory[];
}) {
  const [editing, setEditing] = useState(false);
  const action = updatePessoalRecorrente.bind(null, expense.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setEditing(false));

  if (editing) {
    return (
      <form
        action={formAction}
        className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
      >
        <RecorrenteFields expense={expense} contas={contas} categorias={categorias} />
        {state && "error" in state && (
          <p className="text-xs text-rose-400">{state.error}</p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-petrol-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-petrol-500 disabled:opacity-60"
          >
            {pending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    );
  }

  const conta = contas.find((c) => c.id === expense.account_id);
  const categoria = categorias.find((c) => c.id === expense.category_id);
  const displayStatus = payment
    ? computeDisplayStatus(payment.status, expense.due_day, referenceMonth)
    : "pendente";

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5 ${
        !expense.is_active ? "opacity-50" : ""
      }`}
    >
      <div className="min-w-0">
        <p className="truncate text-sm text-zinc-200">{expense.name}</p>
        <p className="text-xs text-zinc-500">
          {formatCurrency(expense.amount)} · dia {expense.due_day}
          {conta && ` · ${conta.name}`}
          {categoria && ` · ${categoria.name}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {expense.is_active ? (
          <StatusChip tone={STATUS_TONE[displayStatus]}>
            {DISPLAY_STATUS_LABEL[displayStatus]}
          </StatusChip>
        ) : (
          <StatusChip tone="zinc">Inativa</StatusChip>
        )}
        {expense.is_active && payment && displayStatus !== "paga" && (
          <form action={markPessoalRecorrentePaga.bind(null, payment.id)}>
            <button
              type="submit"
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-950/40"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Marcar como paga
            </button>
          </form>
        )}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <form action={deletePessoalRecorrente.bind(null, expense.id)}>
            <button
              type="submit"
              className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function RecorrentesSection({
  expenses,
  payments,
  contas,
  categorias,
  referenceMonth,
}: {
  expenses: PessoalRecurringExpense[];
  payments: PessoalRecurringExpensePayment[];
  contas: PessoalAccount[];
  categorias: PessoalCategory[];
  referenceMonth: string;
}) {
  const paymentByExpenseId = new Map(
    payments.map((payment) => [payment.recurring_expense_id, payment])
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">
            Gastos Recorrentes
          </h1>
          <p className="text-sm text-zinc-500">
            {expenses.length} gasto(s) fixo(s) cadastrado(s)
          </p>
        </div>
        <NewRecorrenteForm contas={contas} categorias={categorias} />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <Repeat className="h-4 w-4 text-zinc-500" />
          Este mês
        </div>

        {expenses.length > 0 ? (
          <div className="space-y-2">
            {expenses.map((expense) => (
              <RecorrenteRow
                key={expense.id}
                expense={expense}
                payment={paymentByExpenseId.get(expense.id)}
                referenceMonth={referenceMonth}
                contas={contas}
                categorias={categorias}
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-600">
            Nenhum gasto recorrente cadastrado.
          </p>
        )}
      </div>
    </div>
  );
}
