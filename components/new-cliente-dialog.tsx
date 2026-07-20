"use client";

import { useActionState, useEffect, useRef } from "react";
import { Plus, X } from "lucide-react";
import { createCliente } from "@/app/(dashboard)/clientes/actions";

export function NewClienteDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(createCliente, undefined);

  useEffect(() => {
    if (state && "ok" in state) {
      formRef.current?.reset();
      dialogRef.current?.close();
    }
  }, [state]);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
      >
        <Plus className="h-4 w-4" />
        Novo cliente
      </button>

      <dialog
        ref={dialogRef}
        className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-0 text-zinc-100 backdrop:bg-black/60"
        onClose={() => formRef.current?.reset()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 className="text-sm font-semibold">Novo cliente</h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="text-zinc-500 hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form ref={formRef} action={formAction} className="space-y-4 px-5 py-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Nome *</label>
            <input
              name="nome"
              required
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Contato</label>
            <input
              name="contato"
              placeholder="Telefone, e-mail..."
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Resumo</label>
            <textarea
              name="resumo"
              rows={2}
              className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Status</label>
              <select
                name="status"
                defaultValue="pendente"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="pendente">Pendente</option>
                <option value="finalizado">Finalizado</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">
                Abordado por
              </label>
              <input
                name="abordado_por"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
              onClick={() => dialogRef.current?.close()}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {pending ? "Salvando..." : "Criar cliente"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
