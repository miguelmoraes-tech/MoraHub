"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Plus, Pencil, Trash2 } from "lucide-react";
import type { Assinatura, Cliente } from "@/lib/types";
import {
  createAssinante,
  updateAssinante,
  deleteAssinante,
} from "@/app/(dashboard)/assinantes/actions";
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

function AssinanteFields({
  assinatura,
  clientes,
}: {
  assinatura?: Assinatura;
  clientes: Cliente[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">Cliente *</label>
        <select
          name="cliente_id"
          required
          defaultValue={assinatura?.cliente_id ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          <option value="" disabled>
            Selecione...
          </option>
          {clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.nome}
            </option>
          ))}
        </select>
      </div>
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

function NewAssinanteForm({ clientes }: { clientes: Cliente[] }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createAssinante,
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
        Nova assinatura
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <AssinanteFields clientes={clientes} />
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

function AssinanteRow({
  assinatura,
  clientes,
  somenteLeitura,
  semValores,
  clientesIndisponiveis,
  semLinkCliente,
}: {
  assinatura: Assinatura;
  clientes: Cliente[];
  somenteLeitura: boolean;
  semValores: boolean;
  clientesIndisponiveis: boolean;
  semLinkCliente: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const action = updateAssinante.bind(null, assinatura.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setEditing(false));

  if (editing) {
    return (
      <form
        action={formAction}
        className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
      >
        <AssinanteFields assinatura={assinatura} clientes={clientes} />
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

  const cliente = clientes.find((c) => c.id === assinatura.cliente_id);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5">
      <div className="min-w-0">
        <p className="flex items-center gap-2 truncate text-sm text-zinc-200">
          {cliente ? (
            semLinkCliente ? (
              cliente.nome
            ) : (
              <Link
                href={`/clientes/${cliente.id}`}
                className="hover:text-copper-400 hover:underline"
              >
                {cliente.nome}
              </Link>
            )
          ) : clientesIndisponiveis ? (
            "—"
          ) : (
            "Cliente removido"
          )}
          <StatusChip tone={STATUS_TONE[assinatura.status]}>
            {STATUS_LABEL[assinatura.status]}
          </StatusChip>
        </p>
        <p className="text-xs text-zinc-500">
          {semValores ? "—" : assinatura.valor != null && formatCurrency(assinatura.valor)}
          {` · ${assinatura.recorrencia}`}
          {assinatura.proxima_cobranca &&
            ` · próxima cobrança ${formatDate(assinatura.proxima_cobranca)}`}
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
          <form action={deleteAssinante.bind(null, assinatura.id)}>
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

export function AssinantesBoard({
  assinaturas,
  clientes,
  somenteLeitura = false,
  semValores = false,
  clientesIndisponiveis = false,
  semLinkCliente = false,
}: {
  assinaturas: Assinatura[];
  clientes: Cliente[];
  somenteLeitura?: boolean;
  semValores?: boolean;
  /** Sem permissão em Clientes: o nome do cliente aparece como "—". */
  clientesIndisponiveis?: boolean;
  semLinkCliente?: boolean;
}) {
  const grupos = useMemo(() => {
    const porPlano = new Map<string, Assinatura[]>();
    for (const a of assinaturas) {
      const lista = porPlano.get(a.plano) ?? [];
      lista.push(a);
      porPlano.set(a.plano, lista);
    }
    return [...porPlano.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [assinaturas]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Assinantes</h1>
          <p className="text-sm text-zinc-500">
            {assinaturas.length} assinatura(s)
          </p>
        </div>
        {!somenteLeitura && <NewAssinanteForm clientes={clientes} />}
      </div>

      {grupos.length > 0 ? (
        <div className="space-y-5">
          {grupos.map(([plano, itens]) => (
            <div
              key={plano}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
            >
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
                <BadgeCheck className="h-4 w-4 text-zinc-500" />
                {plano}
                <span className="text-xs font-normal text-zinc-500">
                  ({itens.length})
                </span>
              </div>
              <div className="space-y-2">
                {itens.map((assinatura) => (
                  <AssinanteRow
                    key={assinatura.id}
                    assinatura={assinatura}
                    clientes={clientes}
                    somenteLeitura={somenteLeitura}
                    semValores={semValores}
                    clientesIndisponiveis={clientesIndisponiveis}
                    semLinkCliente={semLinkCliente}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 py-20 text-center">
          <BadgeCheck className="h-8 w-8 text-zinc-700" />
          <p className="text-sm text-zinc-500">Nenhuma assinatura cadastrada ainda.</p>
        </div>
      )}
    </div>
  );
}
