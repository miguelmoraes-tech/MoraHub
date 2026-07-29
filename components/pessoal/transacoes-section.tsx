"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowLeftRight, Plus, Pencil, Trash2 } from "lucide-react";
import type {
  PessoalAccount,
  PessoalCategory,
  PessoalTransaction,
} from "@/lib/pessoal/types";
import { currentMonthFilter, monthLabel, monthRange, shiftMonth } from "@/lib/pessoal/period";
import {
  createPessoalTransacao,
  updatePessoalTransacao,
  deletePessoalTransacao,
} from "@/app/(dashboard)/pessoal/transacoes/actions";
import { formatCurrency, formatDate } from "@/lib/format";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { SegmentFilter } from "@/components/segment-filter";

function TransacaoFields({
  transacao,
  contas,
  categorias,
}: {
  transacao?: PessoalTransaction;
  contas: PessoalAccount[];
  categorias: PessoalCategory[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Tipo *</label>
        <select
          name="type"
          defaultValue={transacao?.type ?? "despesa"}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        >
          <option value="receita">Receita</option>
          <option value="despesa">Despesa</option>
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Valor *</label>
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={transacao?.amount}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Data *</label>
        <input
          name="transaction_date"
          type="date"
          required
          defaultValue={transacao?.transaction_date ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        />
      </div>
      <div className="flex items-end gap-1.5 pb-2">
        <input
          id="is_recurring"
          name="is_recurring"
          type="checkbox"
          defaultChecked={transacao?.is_recurring}
          className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-950 accent-petrol-500"
        />
        <label htmlFor="is_recurring" className="text-xs text-zinc-400">
          Recorrente
        </label>
      </div>
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">Descrição</label>
        <input
          name="description"
          defaultValue={transacao?.description ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Conta</label>
        <select
          name="account_id"
          defaultValue={transacao?.account_id ?? ""}
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
          defaultValue={transacao?.category_id ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        >
          <option value="">Nenhuma</option>
          {categorias.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.name} ({categoria.kind === "receita" ? "receita" : "despesa"})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function NewTransacaoForm({
  contas,
  categorias,
}: {
  contas: PessoalAccount[];
  categorias: PessoalCategory[];
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createPessoalTransacao,
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
        Nova transação
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <TransacaoFields contas={contas} categorias={categorias} />
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

function TransacaoRow({
  transacao,
  contas,
  categorias,
}: {
  transacao: PessoalTransaction;
  contas: PessoalAccount[];
  categorias: PessoalCategory[];
}) {
  const [editing, setEditing] = useState(false);
  const action = updatePessoalTransacao.bind(null, transacao.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setEditing(false));

  if (editing) {
    return (
      <form
        action={formAction}
        className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
      >
        <TransacaoFields transacao={transacao} contas={contas} categorias={categorias} />
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

  const conta = contas.find((c) => c.id === transacao.account_id);
  const categoria = categorias.find((c) => c.id === transacao.category_id);
  const isReceita = transacao.type === "receita";

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
            isReceita
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-rose-500/10 text-rose-400"
          }`}
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm text-zinc-200">
            {transacao.description || categoria?.name || (isReceita ? "Receita" : "Despesa")}
          </p>
          <p className="text-xs text-zinc-500">
            {formatDate(transacao.transaction_date)}
            {conta && ` · ${conta.name}`}
            {categoria && ` · ${categoria.name}`}
            {transacao.is_recurring && " · Recorrente"}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span
          className={`text-sm font-medium ${isReceita ? "text-emerald-400" : "text-rose-400"}`}
        >
          {isReceita ? "+" : "-"} {formatCurrency(transacao.amount)}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <form action={deletePessoalTransacao.bind(null, transacao.id)}>
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

export function TransacoesSection({
  transacoes,
  contas,
  categorias,
}: {
  transacoes: PessoalTransaction[];
  contas: PessoalAccount[];
  categorias: PessoalCategory[];
}) {
  const [cursor, setCursor] = useState(() => {
    const filter = currentMonthFilter();
    return filter.mode === "month" ? { year: filter.year, month: filter.month } : { year: 2024, month: 1 };
  });
  const [categoriaNome, setCategoriaNome] = useState("");

  const { start, end } = useMemo(
    () => monthRange(cursor.year, cursor.month),
    [cursor]
  );

  const doMes = useMemo(
    () =>
      transacoes.filter(
        (t) => t.transaction_date >= start && t.transaction_date <= end
      ),
    [transacoes, start, end]
  );

  const categoriaNomes = useMemo(
    () => [...new Set(categorias.map((c) => c.name))].sort((a, b) => a.localeCompare(b)),
    [categorias]
  );

  const filtradas = categoriaNome
    ? doMes.filter((t) => {
        const categoria = categorias.find((c) => c.id === t.category_id);
        return categoria?.name === categoriaNome;
      })
    : doMes;

  const receitasTotal = doMes
    .filter((t) => t.type === "receita")
    .reduce((sum, t) => sum + t.amount, 0);
  const despesasTotal = doMes
    .filter((t) => t.type === "despesa")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Transações</h1>
          <p className="text-sm text-zinc-500">
            {filtradas.length} transação(ões) no período
          </p>
        </div>
        <NewTransacaoForm contas={contas} categorias={categorias} />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs font-medium text-zinc-500">Receitas do mês</p>
          <p className="mt-1 text-xl font-semibold text-emerald-400">
            {formatCurrency(receitasTotal)}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs font-medium text-zinc-500">Despesas do mês</p>
          <p className="mt-1 text-xl font-semibold text-rose-400">
            {formatCurrency(despesasTotal)}
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 px-2 py-1.5">
          <button
            type="button"
            onClick={() => setCursor((c) => shiftMonth(c.year, c.month, -1))}
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="w-32 text-center text-sm text-zinc-300">
            {monthLabel(cursor.year, cursor.month)}
          </span>
          <button
            type="button"
            onClick={() => setCursor((c) => shiftMonth(c.year, c.month, 1))}
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {categoriaNomes.length > 0 && (
          <SegmentFilter
            value={categoriaNome}
            options={categoriaNomes}
            allLabel="Todas as categorias"
            onChange={setCategoriaNome}
          />
        )}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        {filtradas.length > 0 ? (
          <div className="space-y-2">
            {filtradas.map((transacao) => (
              <TransacaoRow
                key={transacao.id}
                transacao={transacao}
                contas={contas}
                categorias={categorias}
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-600">
            Nenhuma transação neste período.
          </p>
        )}
      </div>
    </div>
  );
}
