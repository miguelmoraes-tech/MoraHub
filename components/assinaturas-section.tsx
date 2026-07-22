"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { BadgeCheck, Plus, Pencil, Trash2 } from "lucide-react";
import type { Assinatura } from "@/lib/types";
import {
  createAssinatura,
  updateAssinatura,
  deleteAssinatura,
} from "@/app/(dashboard)/clientes/[id]/actions";
import { formatCurrency, formatDate } from "@/lib/format";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { StatusChip, type ChipTone } from "@/components/status-chip";

const STATUS_LABEL: Record<Assinatura["status"], string> = {
  ativa: "Ativa",
  pausada: "Pausada",
  cancelada: "Cancelada",
};

const STATUS_TONE: Record<Assinatura["status"], ChipTone> = {
  ativa: "emerald",
  pausada: "amber",
  cancelada: "rose",
};

function AssinaturaFields({ assinatura }: { assinatura?: Assinatura }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">Plano *</label>
        <input
          name="plano"
          required
          defaultValue={assinatura?.plano}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Valor</label>
        <input
          name="valor"
          type="number"
          step="0.01"
          min="0"
          defaultValue={assinatura?.valor ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Recorrência
        </label>
        <select
          name="recorrencia"
          defaultValue={assinatura?.recorrencia ?? "Mensal"}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          <option value="Mensal">Mensal</option>
          <option value="Anual">Anual</option>
          <option value="Único">Único</option>
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Início</label>
        <input
          name="data_inicio"
          type="date"
          defaultValue={assinatura?.data_inicio ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Próxima cobrança
        </label>
        <input
          name="proxima_cobranca"
          type="date"
          defaultValue={assinatura?.proxima_cobranca ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Status</label>
        <select
          name="status"
          defaultValue={assinatura?.status ?? "ativa"}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          <option value="ativa">Ativa</option>
          <option value="pausada">Pausada</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>
    </div>
  );
}

function NewAssinaturaForm({ clienteId }: { clienteId: string }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const action = createAssinatura.bind(null, clienteId);
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
        className="flex items-center gap-1.5 text-xs font-medium text-copper-400 hover:text-copper-300"
      >
        <Plus className="h-3.5 w-3.5" />
        Adicionar assinatura
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <AssinaturaFields />
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

function AssinaturaRow({
  clienteId,
  assinatura,
}: {
  clienteId: string;
  assinatura: Assinatura;
}) {
  const [editing, setEditing] = useState(false);
  const action = updateAssinatura.bind(null, clienteId, assinatura.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setEditing(false));

  if (editing) {
    return (
      <form
        action={formAction}
        className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
      >
        <AssinaturaFields assinatura={assinatura} />
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

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5">
      <div className="min-w-0">
        <p className="flex items-center gap-2 truncate text-sm text-zinc-200">
          {assinatura.plano}
          <StatusChip tone={STATUS_TONE[assinatura.status]}>
            {STATUS_LABEL[assinatura.status]}
          </StatusChip>
        </p>
        <p className="text-xs text-zinc-500">
          {assinatura.valor != null && formatCurrency(assinatura.valor)}
          {` · ${assinatura.recorrencia}`}
          {assinatura.proxima_cobranca &&
            ` · próxima cobrança ${formatDate(assinatura.proxima_cobranca)}`}
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
        <form action={deleteAssinatura.bind(null, clienteId, assinatura.id)}>
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

export function AssinaturasSection({
  clienteId,
  assinaturas,
}: {
  clienteId: string;
  assinaturas: Assinatura[];
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <BadgeCheck className="h-4 w-4 text-zinc-500" />
          Assinaturas
        </h2>
        <NewAssinaturaForm clienteId={clienteId} />
      </div>

      {assinaturas.length > 0 ? (
        <div className="space-y-2">
          {assinaturas.map((assinatura) => (
            <AssinaturaRow
              key={assinatura.id}
              clienteId={clienteId}
              assinatura={assinatura}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-600">Nenhuma assinatura cadastrada.</p>
      )}
    </div>
  );
}
