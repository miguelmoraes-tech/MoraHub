"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Handshake, Plus, Pencil, Trash2 } from "lucide-react";
import type { Proposta } from "@/lib/types";
import {
  createProposta,
  updateProposta,
  deleteProposta,
} from "@/lib/actions/propostas";
import { formatCurrency, formatDate } from "@/lib/format";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { StatusChip, type ChipTone } from "@/components/status-chip";

const STATUS_LABEL: Record<Proposta["status"], string> = {
  enviada: "Enviada",
  em_negociacao: "Em negociação",
  aceita: "Aceita",
  recusada: "Recusada",
};

const STATUS_TONE: Record<Proposta["status"], ChipTone> = {
  enviada: "sky",
  em_negociacao: "amber",
  aceita: "emerald",
  recusada: "rose",
};

const STATUS_ROW_CLASS: Record<Proposta["status"], string> = {
  enviada: "border-zinc-800/80",
  em_negociacao: "border-amber-800/60 bg-amber-950/20",
  aceita: "border-emerald-800/60 bg-emerald-950/20",
  recusada: "border-rose-800/60 bg-rose-950/20",
};

function ordenarPropostas(propostas: Proposta[]) {
  return [...propostas].sort((a, b) => {
    if (b.versao !== a.versao) return b.versao - a.versao;
    return (b.data_envio ?? "").localeCompare(a.data_envio ?? "");
  });
}

function PropostaFields({
  proposta,
  proximaVersao,
}: {
  proposta?: Proposta;
  proximaVersao: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">Título *</label>
        <input
          name="titulo"
          required
          defaultValue={proposta?.titulo}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Versão *</label>
        <input
          name="versao"
          type="number"
          min="1"
          required
          defaultValue={proposta?.versao ?? proximaVersao}
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
          defaultValue={proposta?.valor ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Status</label>
        <select
          name="status"
          defaultValue={proposta?.status ?? "enviada"}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          <option value="enviada">Enviada</option>
          <option value="em_negociacao">Em negociação</option>
          <option value="aceita">Aceita</option>
          <option value="recusada">Recusada</option>
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Data de envio
        </label>
        <input
          name="data_envio"
          type="date"
          defaultValue={proposta?.data_envio ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="col-span-2 space-y-1 sm:col-span-1">
        <label className="text-xs font-medium text-zinc-400">
          Data de resposta
        </label>
        <input
          name="data_resposta"
          type="date"
          defaultValue={proposta?.data_resposta ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="col-span-2 space-y-1 sm:col-span-4">
        <label className="text-xs font-medium text-zinc-400">Descrição</label>
        <textarea
          name="descricao"
          rows={2}
          defaultValue={proposta?.descricao ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="col-span-2 space-y-1 sm:col-span-4">
        <label className="text-xs font-medium text-zinc-400">
          Observações
        </label>
        <textarea
          name="observacoes"
          rows={2}
          defaultValue={proposta?.observacoes ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
    </div>
  );
}

function NewPropostaForm({
  leadId,
  clienteId,
  proximaVersao,
}: {
  leadId: string | null;
  clienteId: string | null;
  proximaVersao: number;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const action = createProposta.bind(null, leadId, clienteId);
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
        Nova proposta
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <PropostaFields proximaVersao={proximaVersao} />
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

function PropostaRow({
  proposta,
  leadId,
  clienteId,
}: {
  proposta: Proposta;
  leadId: string | null;
  clienteId: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const action = updateProposta.bind(null, proposta.id, leadId, clienteId);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setEditing(false));

  if (editing) {
    return (
      <form
        action={formAction}
        className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
      >
        <PropostaFields proposta={proposta} proximaVersao={proposta.versao} />
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
    <div
      className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${STATUS_ROW_CLASS[proposta.status]}`}
    >
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
          <span className="text-zinc-500">v{proposta.versao}</span>
          <span className="truncate">{proposta.titulo}</span>
          <StatusChip tone={STATUS_TONE[proposta.status]}>
            {STATUS_LABEL[proposta.status]}
          </StatusChip>
        </p>
        <p className="text-xs text-zinc-500">
          {proposta.valor != null && formatCurrency(proposta.valor)}
          {proposta.data_envio && ` · enviada ${formatDate(proposta.data_envio)}`}
          {proposta.data_resposta &&
            ` · respondida ${formatDate(proposta.data_resposta)}`}
        </p>
        {proposta.descricao && (
          <p className="mt-1 text-xs text-zinc-500">{proposta.descricao}</p>
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
        <form action={deleteProposta.bind(null, proposta.id, leadId, clienteId)}>
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

export function PropostasSection({
  leadId = null,
  clienteId = null,
  propostas,
}: {
  leadId?: string | null;
  clienteId?: string | null;
  propostas: Proposta[];
}) {
  const ordenadas = ordenarPropostas(propostas);
  const ultima = ordenadas[0];
  const proximaVersao =
    propostas.length > 0 ? Math.max(...propostas.map((p) => p.versao)) + 1 : 1;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <Handshake className="h-4 w-4 text-zinc-500" />
            Propostas
          </h2>
          {ultima && (
            <p className="mt-1 text-xs text-zinc-500">
              Última proposta:{" "}
              {ultima.valor != null ? formatCurrency(ultima.valor) : "sem valor"}{" "}
              — {STATUS_LABEL[ultima.status]}
            </p>
          )}
        </div>
        <NewPropostaForm
          leadId={leadId}
          clienteId={clienteId}
          proximaVersao={proximaVersao}
        />
      </div>

      {ordenadas.length > 0 ? (
        <div className="space-y-2">
          {ordenadas.map((proposta) => (
            <PropostaRow
              key={proposta.id}
              proposta={proposta}
              leadId={leadId}
              clienteId={clienteId}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-600">Nenhuma proposta cadastrada.</p>
      )}
    </div>
  );
}
