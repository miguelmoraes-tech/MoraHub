"use client";

import { useActionState, useEffect, useRef } from "react";
import { Plus, X } from "lucide-react";
import { createLead } from "@/app/(dashboard)/leads/actions";
import { LeadFields } from "@/components/lead-fields";

export function NewLeadDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(createLead, undefined);

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
        Novo lead
      </button>

      <dialog
        ref={dialogRef}
        className="fixed inset-0 m-0 hidden h-full max-h-none w-full max-w-none open:flex items-center justify-center bg-transparent p-4 text-zinc-100 backdrop:bg-black/60"
        onClose={() => formRef.current?.reset()}
      >
        <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
            <h2 className="text-sm font-semibold">Novo lead</h2>
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
            <LeadFields />

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
                {pending ? "Salvando..." : "Criar lead"}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
