"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { FileSignature, Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import type { Contrato } from "@/lib/types";
import {
  createContrato,
  updateContrato,
  deleteContrato,
} from "@/app/(dashboard)/clientes/[id]/actions";
import { formatCurrency, formatDate } from "@/lib/format";
import { useActionSuccess } from "@/lib/hooks/use-action-success";

function ContratoFields({ contrato }: { contrato?: Contrato }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Descrição *
        </label>
        <input
          name="descricao"
          required
          defaultValue={contrato?.descricao}
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
          defaultValue={contrato?.valor}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Link</label>
        <input
          name="link"
          defaultValue={contrato?.link ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Data</label>
        <input
          name="data"
          type="date"
          defaultValue={contrato?.data ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Vencimento
        </label>
        <input
          name="vencimento"
          type="date"
          defaultValue={contrato?.vencimento ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>
    </div>
  );
}

function NewContratoForm({ clienteId }: { clienteId: string }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const action = createContrato.bind(null, clienteId);
  const [state, formAction, pending] = useActionState(action, undefined);

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
        Adicionar contrato
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <ContratoFields />
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

function ContratoRow({
  clienteId,
  contrato,
}: {
  clienteId: string;
  contrato: Contrato;
}) {
  const [editing, setEditing] = useState(false);
  const action = updateContrato.bind(null, clienteId, contrato.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setEditing(false));

  if (editing) {
    return (
      <form
        action={formAction}
        className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
      >
        <ContratoFields contrato={contrato} />
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

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm text-zinc-200">{contrato.descricao}</p>
        <p className="text-xs text-zinc-500">
          {formatCurrency(contrato.valor)}
          {contrato.data && ` · assinado ${formatDate(contrato.data)}`}
          {contrato.vencimento && ` · vence ${formatDate(contrato.vencimento)}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {contrato.link && (
          <a
            href={contrato.link}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <form action={deleteContrato.bind(null, clienteId, contrato.id)}>
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

export function ContratosSection({
  clienteId,
  contratos,
}: {
  clienteId: string;
  contratos: Contrato[];
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <FileSignature className="h-4 w-4 text-zinc-500" />
          Contratos
        </h2>
        <NewContratoForm clienteId={clienteId} />
      </div>

      {contratos.length > 0 ? (
        <div className="space-y-2">
          {contratos.map((contrato) => (
            <ContratoRow
              key={contrato.id}
              clienteId={clienteId}
              contrato={contrato}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-600">Nenhum contrato cadastrado.</p>
      )}
    </div>
  );
}
