"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Server, Plus, Pencil, Trash2 } from "lucide-react";
import type { Infraestrutura } from "@/lib/types";
import {
  createInfraestrutura,
  updateInfraestrutura,
  deleteInfraestrutura,
} from "@/app/(dashboard)/clientes/[id]/actions";
import { formatDate } from "@/lib/format";
import { useActionSuccess } from "@/lib/hooks/use-action-success";

function InfraestruturaFields({ infra }: { infra?: Infraestrutura }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Domínio *
        </label>
        <input
          name="dominio"
          required
          defaultValue={infra?.dominio}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Hospedagem
        </label>
        <input
          name="hospedagem"
          defaultValue={infra?.hospedagem ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Servidor</label>
        <input
          name="servidor"
          defaultValue={infra?.servidor ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">DNS</label>
        <input
          name="dns"
          defaultValue={infra?.dns ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">SSL</label>
        <input
          name="ssl"
          defaultValue={infra?.ssl ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">CDN</label>
        <input
          name="cdn"
          defaultValue={infra?.cdn ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Contas de e-mail
        </label>
        <input
          name="contas_email"
          defaultValue={infra?.contas_email ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Tecnologias
        </label>
        <input
          name="tecnologias"
          defaultValue={infra?.tecnologias ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Renovação
        </label>
        <input
          name="data_renovacao"
          type="date"
          defaultValue={infra?.data_renovacao ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div className="col-span-2 space-y-1 sm:col-span-4">
        <label className="text-xs font-medium text-zinc-400">
          Observações
        </label>
        <textarea
          name="observacoes"
          rows={2}
          defaultValue={infra?.observacoes ?? ""}
          className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>
    </div>
  );
}

function NewInfraestruturaForm({ clienteId }: { clienteId: string }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const action = createInfraestrutura.bind(null, clienteId);
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
        Adicionar infraestrutura
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <InfraestruturaFields />
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

function InfraestruturaRow({
  clienteId,
  infra,
}: {
  clienteId: string;
  infra: Infraestrutura;
}) {
  const [editing, setEditing] = useState(false);
  const action = updateInfraestrutura.bind(null, clienteId, infra.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setEditing(false));

  if (editing) {
    return (
      <form
        action={formAction}
        className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
      >
        <InfraestruturaFields infra={infra} />
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

  const detalhes = [infra.hospedagem, infra.servidor, infra.tecnologias]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm text-zinc-200">{infra.dominio}</p>
        {detalhes && <p className="text-xs text-zinc-500">{detalhes}</p>}
        {infra.data_renovacao && (
          <p className="text-xs text-zinc-500">
            renovação em {formatDate(infra.data_renovacao)}
          </p>
        )}
        {infra.observacoes && (
          <p className="mt-1 text-xs text-zinc-500">{infra.observacoes}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <form action={deleteInfraestrutura.bind(null, clienteId, infra.id)}>
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

export function InfraestruturaSection({
  clienteId,
  infraestrutura,
}: {
  clienteId: string;
  infraestrutura: Infraestrutura[];
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <Server className="h-4 w-4 text-zinc-500" />
          Infraestrutura
        </h2>
        <NewInfraestruturaForm clienteId={clienteId} />
      </div>

      {infraestrutura.length > 0 ? (
        <div className="space-y-2">
          {infraestrutura.map((infra) => (
            <InfraestruturaRow
              key={infra.id}
              clienteId={clienteId}
              infra={infra}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-600">
          Nenhuma infraestrutura cadastrada.
        </p>
      )}
    </div>
  );
}
