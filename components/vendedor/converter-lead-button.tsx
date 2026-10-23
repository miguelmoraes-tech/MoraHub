"use client";

import { useActionState, useRef } from "react";
import { UserPlus, X } from "lucide-react";
import type { Lead } from "@/lib/types";
import { converterLeadEmCliente } from "@/app/vendedor/actions";
import { useActionToast } from "@/lib/hooks/use-action-toast";

export function ConverterLeadButton({
  lead,
  onConverted,
}: {
  lead: Pick<Lead, "id" | "nome">;
  onConverted?: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(
    converterLeadEmCliente.bind(null, lead.id),
    undefined
  );
  useActionToast(state, {
    success: "Lead convertido em cliente.",
    onSuccess: () => {
      dialogRef.current?.close();
      onConverted?.();
    },
  });

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
      >
        <UserPlus className="h-3.5 w-3.5" />
        Converter em cliente
      </button>

      <dialog
        ref={dialogRef}
        className="fixed inset-0 m-0 hidden h-full max-h-none w-full max-w-none open:flex items-center justify-center bg-transparent p-4 text-zinc-100 backdrop:bg-black/60"
      >
        <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
            <h2 className="text-sm font-semibold">Converter em cliente</h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="text-zinc-500 hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form action={formAction} className="space-y-4 px-5 py-4">
            <p className="text-sm text-zinc-300">
              Converter <strong className="text-zinc-100">{lead.nome}</strong>{" "}
              em cliente? O lead será marcado como convertido e um cliente será
              criado com os dados dele. Não dá para desfazer.
            </p>
            <div className="flex justify-end gap-2">
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
                {pending ? "Convertendo..." : "Converter"}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
