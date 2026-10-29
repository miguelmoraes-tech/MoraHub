"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Receipt, Plus, Pencil, Trash2 } from "lucide-react";
import type { Gasto, Cliente, Projeto } from "@/lib/types";
import {
  createGasto,
  updateGasto,
  deleteGasto,
} from "@/app/(dashboard)/gastos/actions";
import { formatCurrency, formatDate } from "@/lib/format";
import { useActionSuccess } from "@/lib/hooks/use-action-success";

function GastoFields({
  gasto,
  clientes,
  projetos,
}: {
  gasto?: Gasto;
  clientes: Cliente[];
  projetos: Projeto[];
}) {
  const [clienteId, setClienteId] = useState(gasto?.cliente_id ?? "");
  const projetosDoCliente = projetos.filter((p) => p.cliente_id === clienteId);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">Nome *</label>
        <input
          name="nome"
          required
          defaultValue={gasto?.nome}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
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
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Data *</label>
        <input
          name="data"
          type="date"
          required
          defaultValue={gasto?.data ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Tipo</label>
        <select
          name="tipo"
          defaultValue={gasto?.tipo ?? "pontual"}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          <option value="fixo">Fixo</option>
          <option value="pontual">Pontual</option>
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Recorrência
        </label>
        <select
          name="recorrencia"
          defaultValue={gasto?.recorrencia ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          <option value="">Nenhuma</option>
          <option value="Mensal">Mensal</option>
          <option value="Anual">Anual</option>
          <option value="Único">Único</option>
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Cliente (opcional)
        </label>
        <select
          name="cliente_id"
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          <option value="">Nenhum</option>
          {clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.nome}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Projeto (opcional)
        </label>
        <select
          key={clienteId}
          name="projeto_id"
          defaultValue={
            projetosDoCliente.some((p) => p.id === gasto?.projeto_id)
              ? gasto?.projeto_id ?? ""
              : ""
          }
          disabled={!clienteId}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500 disabled:opacity-50"
        >
          <option value="">Nenhum</option>
          {projetosDoCliente.map((projeto) => (
            <option key={projeto.id} value={projeto.id}>
              {projeto.nome}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Categoria (orçamento)
        </label>
        <input
          name="categoria"
          defaultValue={gasto?.categoria ?? ""}
          placeholder="Ex: Marketing"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
    </div>
  );
}

function NewGastoForm({
  clientes,
  projetos,
}: {
  clientes: Cliente[];
  projetos: Projeto[];
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(createGasto, undefined);

  useActionSuccess(state, () => setOpen(false));

  useEffect(() => {
    if (!open) formRef.current?.reset();
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-copper-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-copper-500"
      >
        <Plus className="h-4 w-4" />
        Novo gasto
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <GastoFields clientes={clientes} projetos={projetos} />
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
          className="rounded-md bg-copper-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-copper-500 disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}

function GastoRow({
  gasto,
  clientes,
  projetos,
  somenteLeitura,
  semValores,
  auxiliarIndisponivel,
}: {
  gasto: Gasto;
  clientes: Cliente[];
  projetos: Projeto[];
  somenteLeitura: boolean;
  semValores: boolean;
  auxiliarIndisponivel: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const action = updateGasto.bind(null, gasto.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setEditing(false));

  if (editing) {
    return (
      <form
        action={formAction}
        className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
      >
        <GastoFields gasto={gasto} clientes={clientes} projetos={projetos} />
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
            className="rounded-md bg-copper-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-copper-500 disabled:opacity-60"
          >
            {pending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    );
  }

  const cliente = clientes.find((c) => c.id === gasto.cliente_id);
  const projeto = projetos.find((p) => p.id === gasto.projeto_id);
  const detalhes = [
    gasto.tipo === "fixo" ? "Fixo" : "Pontual",
    gasto.recorrencia,
    cliente?.nome,
    projeto?.nome,
    gasto.categoria,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm text-zinc-200">{gasto.nome}</p>
        <p className="text-xs text-zinc-500">
          {semValores ? "—" : formatCurrency(gasto.valor)} · {formatDate(gasto.data)}
          {detalhes && ` · ${detalhes}`}
          {auxiliarIndisponivel && (gasto.cliente_id || gasto.projeto_id) && " · cliente/projeto: —"}
        </p>
      </div>
      {!somenteLeitura && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <form action={deleteGasto.bind(null, gasto.id)}>
            <button
              type="submit"
              className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function GastosSection({
  gastos,
  clientes,
  projetos,
  somenteLeitura = false,
  semValores = false,
  auxiliarIndisponivel = false,
}: {
  gastos: Gasto[];
  clientes: Cliente[];
  projetos: Projeto[];
  somenteLeitura?: boolean;
  semValores?: boolean;
  /** Sem permissão em Clientes: cliente/projeto aparecem como "—". */
  auxiliarIndisponivel?: boolean;
}) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Gastos</h1>
          <p className="text-sm text-zinc-500">
            {gastos.length} gasto(s) registrado(s)
          </p>
        </div>
        {!somenteLeitura && <NewGastoForm clientes={clientes} projetos={projetos} />}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <Receipt className="h-4 w-4 text-zinc-500" />
          Todos os gastos
        </div>

        {gastos.length > 0 ? (
          <div className="space-y-2">
            {gastos.map((gasto) => (
              <GastoRow
                key={gasto.id}
                gasto={gasto}
                clientes={clientes}
                projetos={projetos}
                somenteLeitura={somenteLeitura}
                semValores={semValores}
                auxiliarIndisponivel={auxiliarIndisponivel}
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-600">Nenhum gasto cadastrado.</p>
        )}
      </div>
    </div>
  );
}
