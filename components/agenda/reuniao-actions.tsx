"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { CalendarClock, CheckCircle2, X, XCircle } from "lucide-react";
import type { ReuniaoComLead } from "@/lib/agenda-shared";
import { datetimeLocalToISO, toDatetimeLocalValue } from "@/lib/agenda-shared";
import { atualizarStatusReuniao, remarcarReuniao } from "@/app/vendedor/actions";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import { useToast } from "@/components/toast";

const FIELD =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500";

/** Vendedor-only controls for one reunião: remarcar / cancelar / marcar realizada. */
export function ReuniaoActions({ reuniao }: { reuniao: ReuniaoComLead }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [openCount, setOpenCount] = useState(0);

  if (reuniao.status === "realizada") return null;

  function mudarStatus(status: "cancelada" | "realizada", mensagem: string) {
    startTransition(async () => {
      const result = await atualizarStatusReuniao(reuniao.id, status);
      if (result && "error" in result) {
        toast.error(result.error);
      } else {
        toast.success(mensagem);
        setConfirmandoCancelar(false);
      }
    });
  }

  if (confirmandoCancelar) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-zinc-400">Cancelar esta reunião?</span>
        <button
          type="button"
          disabled={pending}
          onClick={() => mudarStatus("cancelada", "Reunião cancelada.")}
          className="rounded-md bg-rose-600 px-2 py-1 font-medium text-white hover:bg-rose-500 disabled:opacity-60"
        >
          Confirmar
        </button>
        <button
          type="button"
          onClick={() => setConfirmandoCancelar(false)}
          className="rounded-md px-2 py-1 font-medium text-zinc-400 hover:text-zinc-200"
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setOpenCount((c) => c + 1);
            dialogRef.current?.showModal();
          }}
          className="flex items-center gap-1.5 text-xs font-medium text-sky-400 hover:text-sky-300"
        >
          <CalendarClock className="h-3.5 w-3.5" />
          Remarcar
        </button>
        {reuniao.status === "agendada" && (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => mudarStatus("realizada", "Reunião marcada como realizada.")}
              className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 disabled:opacity-60"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Marcar realizada
            </button>
            <button
              type="button"
              onClick={() => setConfirmandoCancelar(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-rose-400"
            >
              <XCircle className="h-3.5 w-3.5" />
              Cancelar
            </button>
          </>
        )}
      </div>

      <dialog
        ref={dialogRef}
        className="fixed inset-0 m-0 hidden h-full max-h-none w-full max-w-none open:flex items-center justify-center bg-transparent p-4 text-zinc-100 backdrop:bg-black/60"
      >
        <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
            <h2 className="truncate pr-2 text-sm font-semibold">
              Remarcar · {reuniao.lead_nome}
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="shrink-0 text-zinc-500 hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <RemarcarForm
            key={openCount}
            reuniao={reuniao}
            onDone={() => dialogRef.current?.close()}
          />
        </div>
      </dialog>
    </>
  );
}

function RemarcarForm({
  reuniao,
  onDone,
}: {
  reuniao: ReuniaoComLead;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    remarcarReuniao.bind(null, reuniao.id),
    undefined
  );
  const [dataHoraLocal, setDataHoraLocal] = useState(() =>
    toDatetimeLocalValue(reuniao.data_hora)
  );
  useActionToast(state, { success: "Reunião remarcada.", onSuccess: onDone });

  return (
    <form action={formAction} className="space-y-4 px-5 py-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400">
          Nova data e hora *
        </label>
        <input
          type="datetime-local"
          required
          value={dataHoraLocal}
          onChange={(e) => setDataHoraLocal(e.target.value)}
          className={FIELD}
        />
        <input
          type="hidden"
          name="data_hora"
          value={datetimeLocalToISO(dataHoraLocal) ?? ""}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400">Observações</label>
        <textarea
          name="observacoes"
          rows={3}
          maxLength={2000}
          defaultValue={reuniao.observacoes ?? ""}
          className={`${FIELD} resize-none`}
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg px-3.5 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending || !datetimeLocalToISO(dataHoraLocal)}
          className="rounded-lg bg-copper-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-copper-500 disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Remarcar"}
        </button>
      </div>
    </form>
  );
}
