"use client";

import { useActionState, useState } from "react";
import { Trash2, Check } from "lucide-react";
import type { Cliente } from "@/lib/types";
import { updateCliente, deleteCliente } from "@/app/(dashboard)/clientes/actions";

export function ClienteForm({ cliente }: { cliente: Cliente }) {
  const updateWithId = updateCliente.bind(null, cliente.id);
  const [state, formAction, pending] = useActionState(updateWithId, undefined);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-100">Dados gerais</h2>

        {confirmingDelete ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-400">Excluir este cliente?</span>
            <form action={deleteCliente.bind(null, cliente.id)}>
              <button
                type="submit"
                className="rounded-md bg-rose-600 px-2 py-1 font-medium text-white hover:bg-rose-500"
              >
                Confirmar
              </button>
            </form>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="rounded-md px-2 py-1 font-medium text-zinc-400 hover:text-zinc-200"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-rose-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Excluir cliente
          </button>
        )}
      </div>

      <form action={formAction} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Nome *</label>
            <input
              name="nome"
              defaultValue={cliente.nome}
              required
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Contato</label>
            <input
              name="contato"
              defaultValue={cliente.contato ?? ""}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">Resumo</label>
          <textarea
            name="resumo"
            rows={2}
            defaultValue={cliente.resumo ?? ""}
            className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">
            Link do site
          </label>
          <input
            name="site_link"
            defaultValue={cliente.site_link ?? ""}
            placeholder="https://..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Status</label>
            <select
              name="status"
              defaultValue={cliente.status}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
              defaultValue={cliente.abordado_por ?? ""}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
          <label className="flex items-center gap-2 text-sm text-zinc-200">
            <input
              type="checkbox"
              name="assinatura_ativa"
              defaultChecked={cliente.assinatura_ativa}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 accent-indigo-600"
            />
            Assinatura ativa
          </label>

          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Plano</label>
              <input
                name="assinatura_plano"
                defaultValue={cliente.assinatura_plano ?? ""}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">
                Vencimento
              </label>
              <input
                type="date"
                name="assinatura_vencimento"
                defaultValue={cliente.assinatura_vencimento ?? ""}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {state && "error" in state && (
          <p className="rounded-lg border border-rose-900/50 bg-rose-950/40 px-3 py-2 text-sm text-rose-300">
            {state.error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {pending ? "Salvando..." : "Salvar alterações"}
          </button>
          {state && "ok" in state && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <Check className="h-3.5 w-3.5" />
              Salvo
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
