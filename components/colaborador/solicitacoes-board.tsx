"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Inbox, Plus, Trash2 } from "lucide-react";
import type { SolicitacaoDocumento, SolicitacaoDocumentoStatus } from "@/lib/types";
import type { ClienteVinculado } from "@/lib/colaborador-shared";
import {
  createSolicitacaoDocumento,
  updateSolicitacaoDocumentoStatus,
  deleteSolicitacaoDocumento,
} from "@/lib/actions/solicitacoes-documento";
import { formatDate } from "@/lib/format";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { StatusChip, type ChipTone } from "@/components/status-chip";

export type SolicitacaoComCliente = SolicitacaoDocumento & { clienteNome: string };

const STATUS_LABEL: Record<SolicitacaoDocumentoStatus, string> = {
  pendente: "Pendente",
  enviado: "Enviado",
  concluida: "Concluída",
};

const STATUS_TONE: Record<SolicitacaoDocumentoStatus, ChipTone> = {
  pendente: "amber",
  enviado: "sky",
  concluida: "emerald",
};

const STATUS_OPTIONS: SolicitacaoDocumentoStatus[] = [
  "pendente",
  "enviado",
  "concluida",
];

function NewForm({ clientes }: { clientes: ClienteVinculado[] }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createSolicitacaoDocumento,
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
        Nova solicitação
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <label className="text-xs font-medium text-zinc-400">Cliente *</label>
          <select
            name="cliente_id"
            required
            defaultValue=""
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          >
            <option value="" disabled>
              Selecione o cliente
            </option>
            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nome} · {cliente.donoNome}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2 space-y-1">
          <label className="text-xs font-medium text-zinc-400">Título *</label>
          <input
            name="titulo"
            required
            placeholder="Ex: Extrato bancário de julho"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          />
        </div>
        <div className="col-span-2 space-y-1">
          <label className="text-xs font-medium text-zinc-400">Descrição</label>
          <textarea
            name="descricao"
            rows={2}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          />
        </div>
      </div>
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

function Row({ item }: { item: SolicitacaoComCliente }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 truncate text-sm text-zinc-200">
          {item.titulo}
          <StatusChip tone={STATUS_TONE[item.status]}>
            {STATUS_LABEL[item.status]}
          </StatusChip>
        </p>
        <p className="truncate text-xs text-zinc-500">
          {item.clienteNome}
          {` · ${formatDate(item.created_at.slice(0, 10))}`}
          {item.descricao && ` · ${item.descricao}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <select
          value={item.status}
          disabled={isPending}
          onChange={(e) => {
            const status = e.target.value as SolicitacaoDocumentoStatus;
            startTransition(() => {
              updateSolicitacaoDocumentoStatus(item.id, status);
            });
          }}
          className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-300 outline-none focus:border-copper-500 disabled:opacity-60"
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABEL[status]}
            </option>
          ))}
        </select>
        <form action={deleteSolicitacaoDocumento.bind(null, item.id)}>
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

export function SolicitacoesBoard({
  solicitacoes,
  clientes,
}: {
  solicitacoes: SolicitacaoComCliente[];
  clientes: ClienteVinculado[];
}) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">
            Solicitações de documento
          </h1>
          <p className="text-sm text-zinc-500">
            {solicitacoes.length} solicitação(ões)
          </p>
        </div>
        <NewForm clientes={clientes} />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <Inbox className="h-4 w-4 text-zinc-500" />
          Todas as solicitações
        </div>

        {solicitacoes.length > 0 ? (
          <div className="space-y-2">
            {solicitacoes.map((item) => (
              <Row key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-600">
            Nenhuma solicitação cadastrada.
          </p>
        )}
      </div>
    </div>
  );
}
