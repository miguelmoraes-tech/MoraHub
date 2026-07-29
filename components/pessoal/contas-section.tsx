"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Landmark, Plus, Pencil, Trash2 } from "lucide-react";
import type { PessoalAccount, PessoalTransaction } from "@/lib/pessoal/types";
import { ACCOUNT_TYPES } from "@/lib/pessoal/categories";
import {
  computeEstimatedBalancesByAccount,
  sumEstimatedBalances,
} from "@/lib/pessoal/balance";
import {
  createPessoalConta,
  updatePessoalConta,
  deletePessoalConta,
} from "@/app/(dashboard)/pessoal/contas/actions";
import { formatCurrency } from "@/lib/format";
import { useActionSuccess } from "@/lib/hooks/use-action-success";

type BalanceTransaction = Pick<PessoalTransaction, "account_id" | "type" | "amount">;

function ContaFields({ conta }: { conta?: PessoalAccount }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">Nome *</label>
        <input
          name="name"
          required
          defaultValue={conta?.name}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Saldo *</label>
        <input
          name="balance"
          type="number"
          step="0.01"
          required
          defaultValue={conta?.balance}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        />
      </div>
      <div className="col-span-3 space-y-1 sm:col-span-1">
        <label className="text-xs font-medium text-zinc-400">Tipo *</label>
        <select
          name="type"
          defaultValue={conta?.type ?? "corrente"}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        >
          {ACCOUNT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>
      {conta && (
        <p className="col-span-3 text-xs text-zinc-600">
          Editar o saldo só ajusta o valor-base — não recalcula transações já
          lançadas nesta conta.
        </p>
      )}
    </div>
  );
}

function NewContaForm() {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createPessoalConta,
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
        Nova conta
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <ContaFields />
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

function ContaRow({
  conta,
  saldoEstimado,
}: {
  conta: PessoalAccount;
  saldoEstimado: number;
}) {
  const [editing, setEditing] = useState(false);
  const action = updatePessoalConta.bind(null, conta.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setEditing(false));

  const tipo = ACCOUNT_TYPES.find((t) => t.value === conta.type);
  const Icon = tipo?.icon ?? Landmark;

  if (editing) {
    return (
      <form
        action={formAction}
        className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
      >
        <ContaFields conta={conta} />
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

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-petrol-500/10 text-petrol-400">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm text-zinc-200">{conta.name}</p>
          <p className="text-xs text-zinc-500">{tipo?.label}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-sm font-medium text-zinc-200">
          {formatCurrency(saldoEstimado)}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <form action={deletePessoalConta.bind(null, conta.id)}>
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

export function ContasSection({
  contas,
  transacoes,
}: {
  contas: PessoalAccount[];
  transacoes: BalanceTransaction[];
}) {
  const saldos = useMemo(
    () => computeEstimatedBalancesByAccount(contas, transacoes),
    [contas, transacoes]
  );
  const saldoTotal = useMemo(() => sumEstimatedBalances(saldos), [saldos]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Contas</h1>
          <p className="text-sm text-zinc-500">
            {contas.length} conta(s) · saldo total estimado{" "}
            {formatCurrency(saldoTotal)}
          </p>
        </div>
        <NewContaForm />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <Landmark className="h-4 w-4 text-zinc-500" />
          Todas as contas
        </div>

        {contas.length > 0 ? (
          <div className="space-y-2">
            {contas.map((conta) => (
              <ContaRow
                key={conta.id}
                conta={conta}
                saldoEstimado={saldos.get(conta.id) ?? conta.balance}
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-600">Nenhuma conta cadastrada.</p>
        )}
      </div>
    </div>
  );
}
