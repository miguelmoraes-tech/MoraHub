"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { TrendingUp, Plus, Pencil, Trash2 } from "lucide-react";
import type { PessoalAccount, PessoalInvestment } from "@/lib/pessoal/types";
import { INVESTMENT_TYPES } from "@/lib/pessoal/categories";
import {
  computeInvestmentsSummary,
  getInvestmentCurrentValue,
  getInvestmentReturnPct,
} from "@/lib/pessoal/investments";
import {
  createPessoalInvestimento,
  updatePessoalInvestimento,
  deletePessoalInvestimento,
} from "@/app/(dashboard)/pessoal/investimentos/actions";
import { formatCurrency } from "@/lib/format";
import { useActionSuccess } from "@/lib/hooks/use-action-success";

function ReturnBadge({ investment }: { investment: PessoalInvestment }) {
  const pct = getInvestmentReturnPct(investment);
  if (pct === null) {
    return <span className="text-xs text-zinc-600">Sem atualização de valor ainda</span>;
  }
  const positive = pct >= 0;
  return (
    <span className={`text-xs font-medium ${positive ? "text-emerald-400" : "text-rose-400"}`}>
      {positive ? "+" : ""}
      {(pct * 100).toFixed(2)}%
    </span>
  );
}

function InvestimentoFields({
  investimento,
  contas,
}: {
  investimento?: PessoalInvestment;
  contas: PessoalAccount[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">Nome *</label>
        <input
          name="name"
          required
          defaultValue={investimento?.name}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Tipo *</label>
        <select
          name="investment_type"
          defaultValue={investimento?.investment_type ?? "renda_fixa"}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        >
          {INVESTMENT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Valor investido *
        </label>
        <input
          name="invested_amount"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={investimento?.invested_amount}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Valor atual
        </label>
        <input
          name="current_value"
          type="number"
          step="0.01"
          min="0"
          defaultValue={investimento?.current_value ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Corretora</label>
        <input
          name="broker"
          defaultValue={investimento?.broker ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Data da compra
        </label>
        <input
          name="purchase_date"
          type="date"
          defaultValue={investimento?.purchase_date ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Conta</label>
        <select
          name="account_id"
          defaultValue={investimento?.account_id ?? ""}
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
      <div className="col-span-3 space-y-1">
        <label className="text-xs font-medium text-zinc-400">Notas</label>
        <input
          name="notes"
          defaultValue={investimento?.notes ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        />
      </div>
    </div>
  );
}

function NewInvestimentoForm({ contas }: { contas: PessoalAccount[] }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createPessoalInvestimento,
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
        Novo investimento
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <InvestimentoFields contas={contas} />
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

function InvestimentoRow({
  investimento,
  contas,
}: {
  investimento: PessoalInvestment;
  contas: PessoalAccount[];
}) {
  const [editing, setEditing] = useState(false);
  const action = updatePessoalInvestimento.bind(null, investimento.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setEditing(false));

  if (editing) {
    return (
      <form
        action={formAction}
        className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
      >
        <InvestimentoFields investimento={investimento} contas={contas} />
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

  const tipo = INVESTMENT_TYPES.find((t) => t.value === investimento.investment_type);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm text-zinc-200">{investimento.name}</p>
        <p className="text-xs text-zinc-500">
          {tipo?.label}
          {investimento.broker && ` · ${investimento.broker}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-zinc-200">
            {formatCurrency(getInvestmentCurrentValue(investimento))}
          </p>
          <ReturnBadge investment={investimento} />
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <form action={deletePessoalInvestimento.bind(null, investimento.id)}>
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

export function InvestimentosSection({
  investimentos,
  contas,
}: {
  investimentos: PessoalInvestment[];
  contas: PessoalAccount[];
}) {
  const summary = useMemo(
    () => computeInvestmentsSummary(investimentos),
    [investimentos]
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Investimentos</h1>
          <p className="text-sm text-zinc-500">
            {investimentos.length} investimento(s) cadastrado(s)
          </p>
        </div>
        <NewInvestimentoForm contas={contas} />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs font-medium text-zinc-500">Total investido</p>
          <p className="mt-1 text-xl font-semibold text-zinc-100">
            {formatCurrency(summary.totalInvested)}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs font-medium text-zinc-500">Valor atual</p>
          <p className="mt-1 text-xl font-semibold text-zinc-100">
            {formatCurrency(summary.totalCurrent)}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs font-medium text-zinc-500">
            Rentabilidade consolidada
          </p>
          <p
            className={`mt-1 text-xl font-semibold ${
              summary.returnPct === null
                ? "text-zinc-500"
                : summary.returnPct >= 0
                  ? "text-emerald-400"
                  : "text-rose-400"
            }`}
          >
            {summary.returnPct === null
              ? "—"
              : `${summary.returnPct >= 0 ? "+" : ""}${(summary.returnPct * 100).toFixed(2)}%`}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <TrendingUp className="h-4 w-4 text-zinc-500" />
          Todos os investimentos
        </div>

        {investimentos.length > 0 ? (
          <div className="space-y-2">
            {investimentos.map((investimento) => (
              <InvestimentoRow
                key={investimento.id}
                investimento={investimento}
                contas={contas}
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-600">
            Nenhum investimento cadastrado.
          </p>
        )}
      </div>
    </div>
  );
}
