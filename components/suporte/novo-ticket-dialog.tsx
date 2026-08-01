"use client";

import { useActionState, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { abrirTicket } from "@/app/(dashboard)/suporte/actions";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import type { ColaboradorParaAtribuicao } from "@/lib/types";

export function NovoTicketDialog({
  clientes,
  colaboradores,
}: {
  clientes: { id: string; nome: string }[];
  colaboradores: ColaboradorParaAtribuicao[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [openCount, setOpenCount] = useState(0);

  function handleOpen() {
    setOpenCount((c) => c + 1);
    dialogRef.current?.showModal();
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-1.5 rounded-lg bg-copper-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-copper-500"
      >
        <Plus className="h-4 w-4" />
        Abrir ticket
      </button>

      <dialog
        ref={dialogRef}
        className="fixed inset-0 m-0 hidden h-full max-h-none w-full max-w-none open:flex items-center justify-center bg-transparent p-4 text-zinc-100 backdrop:bg-black/60"
      >
        <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
            <h2 className="text-sm font-semibold">Abrir ticket</h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="text-zinc-500 hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <NovoTicketForm
            key={openCount}
            clientes={clientes}
            colaboradores={colaboradores}
            onDone={() => dialogRef.current?.close()}
          />
        </div>
      </dialog>
    </>
  );
}

function NovoTicketForm({
  clientes,
  colaboradores,
  onDone,
}: {
  clientes: { id: string; nome: string }[];
  colaboradores: ColaboradorParaAtribuicao[];
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(abrirTicket, undefined);
  useActionSuccess(state, onDone);

  if (clientes.length === 0) {
    return (
      <div className="space-y-3 px-5 py-4">
        <p className="text-sm text-zinc-400">
          Cadastre um cliente antes de abrir um ticket.
        </p>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onDone}
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4 px-5 py-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">Cliente *</label>
          <select
            name="cliente_id"
            required
            defaultValue=""
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
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

        <div className="col-span-2 space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">Título *</label>
          <input
            name="titulo"
            required
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          />
        </div>

        <div className="col-span-2 space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">Descrição</label>
          <textarea
            name="descricao"
            rows={3}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">Categoria *</label>
          <select
            name="categoria"
            required
            defaultValue="geral"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          >
            <option value="tecnico">Técnico</option>
            <option value="financeiro">Financeiro</option>
            <option value="juridico">Jurídico</option>
            <option value="contabil">Contábil</option>
            <option value="geral">Geral</option>
            <option value="outro">Outro</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">Prioridade *</label>
          <select
            name="prioridade"
            required
            defaultValue="media"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          >
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">Responsável</label>
          <select
            name="responsavel_id"
            defaultValue=""
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          >
            <option value="">Ninguém</option>
            {colaboradores.map((colaborador) => (
              <option key={colaborador.membro_id} value={colaborador.membro_id}>
                {colaborador.nome || colaborador.email || "Colaborador"}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">
            SLA (horas) *
          </label>
          <input
            name="sla_horas"
            type="number"
            min={1}
            required
            defaultValue={24}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          />
        </div>
      </div>

      {state && "error" in state && (
        <p className="rounded-lg border border-rose-900/50 bg-rose-950/40 px-3 py-2 text-sm text-rose-300">
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg px-3.5 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-copper-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-copper-500 disabled:opacity-60"
        >
          {pending ? "Abrindo..." : "Abrir ticket"}
        </button>
      </div>
    </form>
  );
}
