"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronDown } from "lucide-react";
import { marcarAbordado } from "@/app/(dashboard)/leads/actions";
import { useActionSuccess } from "@/lib/hooks/use-action-success";

export function MarcarAbordadoMenu({ leadId }: { leadId: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"menu" | "negou">("menu");
  const rootRef = useRef<HTMLDivElement>(null);

  const action = marcarAbordado.bind(null, leadId);
  const [state, formAction, pending] = useActionState(action, undefined);

  function close() {
    setOpen(false);
    setStep("menu");
  }

  // O card sai da aba "A abordar" após o revalidatePath; fechar evita estado preso.
  useActionSuccess(state, close);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        disabled={pending}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 text-xs font-medium text-copper-400 hover:text-copper-300 disabled:opacity-60"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        {pending ? "Salvando..." : "Marcar como abordado"}
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full right-0 z-20 mb-2 w-64 rounded-lg border border-zinc-800 bg-zinc-950 p-1.5 shadow-lg"
        >
          {step === "menu" ? (
            <form action={formAction} className="flex flex-col">
              <button
                type="button"
                role="menuitem"
                disabled={pending}
                onClick={() => setStep("negou")}
                className="rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-60"
              >
                Negou
              </button>
              <button
                type="submit"
                role="menuitem"
                name="resultado"
                value="sem_resposta"
                disabled={pending}
                className="rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-60"
              >
                Sem resposta
              </button>
              {state && "error" in state && (
                <p className="px-2.5 pb-1 pt-1.5 text-xs text-rose-400">
                  {state.error}
                </p>
              )}
            </form>
          ) : (
            <form action={formAction} className="space-y-2 p-1">
              <input type="hidden" name="resultado" value="negou" />
              <label className="block text-xs font-medium text-zinc-400">
                Motivo da negativa (opcional)
              </label>
              <input
                name="motivo_negou"
                autoFocus
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
              />
              {state && "error" in state && (
                <p className="text-xs text-rose-400">{state.error}</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStep("menu")}
                  disabled={pending}
                  className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 disabled:opacity-60"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-md bg-copper-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-copper-500 disabled:opacity-60"
                >
                  {pending ? "Salvando..." : "Confirmar"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
