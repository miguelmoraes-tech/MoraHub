"use client";

import { useActionState, useEffect, useRef } from "react";
import { UserPlus, X } from "lucide-react";
import type { Lead } from "@/lib/types";
import { convertLeadToCliente } from "@/app/(dashboard)/leads/actions";

export function ConvertLeadDialog({ lead }: { lead: Lead }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const action = convertLeadToCliente.bind(null, lead.id);
  const [state, formAction, pending] = useActionState(action, undefined);

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
        className="flex items-center gap-1.5 text-xs font-medium text-copper-400 hover:text-copper-300"
      >
        <UserPlus className="h-3.5 w-3.5" />
        Converter em cliente
      </button>

      <dialog
        ref={dialogRef}
        className="fixed inset-0 m-0 hidden h-full max-h-none w-full max-w-none open:flex items-center justify-center bg-transparent p-4 text-zinc-100 backdrop:bg-black/60"
        onClose={() => formRef.current?.reset()}
      >
        <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
            <h2 className="text-sm font-semibold">Converter lead em cliente</h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="text-zinc-500 hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form
            ref={formRef}
            action={formAction}
            className="max-h-[calc(100vh-8rem)] space-y-4 overflow-y-auto px-5 py-4"
          >
            <p className="text-xs text-zinc-500">
              Revise os dados abaixo antes de criar o registro de cliente. O
              lead &quot;{lead.nome}&quot; será marcado como convertido.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">
                Nome *
              </label>
              <input
                name="nome"
                required
                defaultValue={lead.nome}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">
                  Telefone
                </label>
                <input
                  name="telefone"
                  placeholder="(00) 00000-0000"
                  defaultValue={lead.contato ?? ""}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">
                  E-mail
                </label>
                <input
                  name="email"
                  type="email"
                  placeholder="contato@empresa.com"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">
                Link do site
              </label>
              <input
                name="site_link"
                placeholder="https://..."
                defaultValue={lead.site_link ?? ""}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">
                Resumo
              </label>
              <textarea
                name="resumo"
                rows={2}
                defaultValue={lead.descricao ?? ""}
                className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">
                  Status
                </label>
                <select
                  name="status"
                  defaultValue="em_andamento"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
                >
                  <option value="ativo">Ativo</option>
                  <option value="em_andamento">Em andamento</option>
                  <option value="pausado">Pausado</option>
                  <option value="encerrado">Encerrado</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">
                  Abordado por
                </label>
                <input
                  name="abordado_por"
                  defaultValue={lead.abordado_por ?? ""}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">
                Segmento
              </label>
              <input
                name="segmento"
                placeholder="Ex: Saúde, Varejo, Educação..."
                defaultValue={lead.nicho ?? ""}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
              />
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
                className="rounded-lg bg-copper-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-copper-500 disabled:opacity-60"
              >
                {pending ? "Convertendo..." : "Criar cliente"}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
