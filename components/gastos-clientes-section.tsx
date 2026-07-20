"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Users, Plus, Pencil, Trash2 } from "lucide-react";
import type { GastoCliente, Cliente } from "@/lib/types";
import {
  createGastoCliente,
  updateGastoCliente,
  deleteGastoCliente,
} from "@/app/(dashboard)/gastos/actions";
import { formatCurrency, formatDate } from "@/lib/format";
import { useActionSuccess } from "@/lib/hooks/use-action-success";

function GastoClienteFields({
  gasto,
  clientes,
}: {
  gasto?: GastoCliente;
  clientes: Cliente[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Cliente *
        </label>
        <select
          name="cliente_id"
          required
          defaultValue={gasto?.cliente_id ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        >
          <option value="" disabled>
            Selecionar
          </option>
          {clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.nome}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Descrição *
        </label>
        <input
          name="descricao"
          required
          defaultValue={gasto?.descricao}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Valor *</label>
        <input
          name="valor"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={gasto?.valor}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Data *</label>
        <input
          name="data"
          type="date"
          required
          defaultValue={gasto?.data ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>
    </div>
  );
}

function NewGastoClienteForm({ clientes }: { clientes: Cliente[] }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createGastoCliente,
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
        className="flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300"
      >
        <Plus className="h-3.5 w-3.5" />
        Adicionar gasto
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <GastoClienteFields clientes={clientes} />
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
          className="rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}

function GastoClienteRow({
  gasto,
  clientes,
}: {
  gasto: GastoCliente;
  clientes: Cliente[];
}) {
  const [editing, setEditing] = useState(false);
  const action = updateGastoCliente.bind(null, gasto.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setEditing(false));

  if (editing) {
    return (
      <form
        action={formAction}
        className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
      >
        <GastoClienteFields gasto={gasto} clientes={clientes} />
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
            className="rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {pending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    );
  }

  const cliente = clientes.find((c) => c.id === gasto.cliente_id);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm text-zinc-200">{gasto.descricao}</p>
        <p className="text-xs text-zinc-500">
          {formatCurrency(gasto.valor)}
          {cliente && ` · ${cliente.nome}`}
          {gasto.data && ` · ${formatDate(gasto.data)}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <form action={deleteGastoCliente.bind(null, gasto.id)}>
          <button
            type="submit"
            className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}

export function GastosClientesSection({
  gastos,
  clientes,
}: {
  gastos: GastoCliente[];
  clientes: Cliente[];
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <Users className="h-4 w-4 text-zinc-500" />
          Gastos por cliente
        </h2>
        <NewGastoClienteForm clientes={clientes} />
      </div>

      {gastos.length > 0 ? (
        <div className="space-y-2">
          {gastos.map((gasto) => (
            <GastoClienteRow key={gasto.id} gasto={gasto} clientes={clientes} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-600">Nenhum gasto cadastrado.</p>
      )}
    </div>
  );
}
