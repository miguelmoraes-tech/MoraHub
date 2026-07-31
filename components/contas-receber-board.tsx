"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { HandCoins, Plus, Pencil, Trash2 } from "lucide-react";
import type { Cliente, ContaReceber, ContaReceberStatus, Proposta } from "@/lib/types";
import {
  createContaReceber,
  updateContaReceber,
  deleteContaReceber,
} from "@/app/(dashboard)/contas-receber/actions";
import { formatCurrency, formatDate } from "@/lib/format";
import { todayISO, diffInDays } from "@/lib/vencimentos/dates";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { StatusChip, type ChipTone } from "@/components/status-chip";

const STATUS_LABEL: Record<ContaReceberStatus, string> = {
  pendente: "Pendente",
  recebido: "Recebido",
  atrasado: "Atrasado",
};

const STATUS_TONE: Record<ContaReceberStatus, ChipTone> = {
  pendente: "amber",
  recebido: "emerald",
  atrasado: "rose",
};

function Fields({
  item,
  clientes,
  propostas,
}: {
  item?: ContaReceber;
  clientes: Cliente[];
  propostas: Proposta[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">Descrição *</label>
        <input
          name="descricao"
          required
          defaultValue={item?.descricao}
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
          defaultValue={item?.valor}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Status</label>
        <select
          name="status"
          defaultValue={item?.status ?? "pendente"}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          <option value="pendente">Pendente</option>
          <option value="recebido">Recebido</option>
          <option value="atrasado">Atrasado</option>
        </select>
      </div>
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Cliente (opcional)
        </label>
        <select
          name="cliente_id"
          defaultValue={item?.cliente_id ?? ""}
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
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Proposta vinculada (opcional)
        </label>
        <select
          name="proposta_id"
          defaultValue={item?.proposta_id ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          <option value="">Nenhuma</option>
          {propostas.map((proposta) => (
            <option key={proposta.id} value={proposta.id}>
              {proposta.titulo}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Vencimento *</label>
        <input
          name="data_vencimento"
          type="date"
          required
          defaultValue={item?.data_vencimento ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Recebimento</label>
        <input
          name="data_recebimento"
          type="date"
          defaultValue={item?.data_recebimento ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="col-span-2 space-y-1 sm:col-span-4">
        <label className="text-xs font-medium text-zinc-400">Observações</label>
        <textarea
          name="observacoes"
          rows={2}
          defaultValue={item?.observacoes ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
    </div>
  );
}

function NewForm({
  clientes,
  propostas,
}: {
  clientes: Cliente[];
  propostas: Proposta[];
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createContaReceber,
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
        className="flex items-center gap-1.5 rounded-lg bg-copper-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-copper-500"
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
      <Fields clientes={clientes} propostas={propostas} />
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

function Row({
  item,
  clientes,
  propostas,
  hoje,
}: {
  item: ContaReceber;
  clientes: Cliente[];
  propostas: Proposta[];
  hoje: string;
}) {
  const [editing, setEditing] = useState(false);
  const action = updateContaReceber.bind(null, item.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setEditing(false));

  if (editing) {
    return (
      <form
        action={formAction}
        className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
      >
        <Fields item={item} clientes={clientes} propostas={propostas} />
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

  const cliente = clientes.find((c) => c.id === item.cliente_id);
  const proposta = propostas.find((p) => p.id === item.proposta_id);
  const dias = diffInDays(hoje, item.data_vencimento);
  const emAberto = item.status !== "recebido";
  const atrasado = emAberto && dias < 0;
  const proximo = emAberto && dias >= 0 && dias <= 7;

  const rowClass = atrasado
    ? "border-rose-800/60 bg-rose-950/20"
    : proximo
      ? "border-amber-800/60 bg-amber-950/20"
      : "border-zinc-800/80";

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${rowClass}`}
    >
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
          {item.descricao}
          <StatusChip tone={STATUS_TONE[item.status]}>
            {STATUS_LABEL[item.status]}
          </StatusChip>
        </p>
        <p className="text-xs text-zinc-500">
          {formatCurrency(item.valor)} · vencimento {formatDate(item.data_vencimento)}
          {atrasado && " (atrasado)"}
          {proximo && " (em breve)"}
          {cliente && ` · ${cliente.nome}`}
          {proposta && ` · ${proposta.titulo}`}
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
        <form action={deleteContaReceber.bind(null, item.id)}>
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

export function ContasReceberBoard({
  contas,
  clientes,
  propostas,
}: {
  contas: ContaReceber[];
  clientes: Cliente[];
  propostas: Proposta[];
}) {
  const hoje = todayISO();
  const ordenadas = [...contas].sort((a, b) =>
    a.data_vencimento.localeCompare(b.data_vencimento)
  );
  const total = contas
    .filter((c) => c.status !== "recebido")
    .reduce((acc, c) => acc + c.valor, 0);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Contas a Receber</h1>
          <p className="text-sm text-zinc-500">
            {ordenadas.length} conta(s) · {formatCurrency(total)} em aberto
          </p>
        </div>
        <NewForm clientes={clientes} propostas={propostas} />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <HandCoins className="h-4 w-4 text-zinc-500" />
          Todas as contas
        </div>

        {ordenadas.length > 0 ? (
          <div className="space-y-2">
            {ordenadas.map((item) => (
              <Row
                key={item.id}
                item={item}
                clientes={clientes}
                propostas={propostas}
                hoje={hoje}
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
