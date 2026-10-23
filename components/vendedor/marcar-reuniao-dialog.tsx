"use client";

import { useActionState, useRef, useState } from "react";
import { CalendarPlus, X } from "lucide-react";
import type { Lead } from "@/lib/types";
import { agendarReuniao } from "@/app/vendedor/actions";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import { datetimeLocalToISO } from "@/lib/agenda-shared";
import {
  REUNIAO_CANAIS,
  REUNIAO_CANAL_LABEL,
} from "@/lib/vendedor-shared";

const FIELD =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500";

export function MarcarReuniaoDialog({
  lead,
  onScheduled,
}: {
  lead: Pick<Lead, "id" | "nome">;
  /** Called after the reunião was saved (the lead may have changed status). */
  onScheduled?: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Remounting the form on every open clears the previous attempt's fields.
  const [openCount, setOpenCount] = useState(0);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpenCount((c) => c + 1);
          dialogRef.current?.showModal();
        }}
        className="flex items-center gap-1.5 rounded-lg bg-copper-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-copper-500"
      >
        <CalendarPlus className="h-3.5 w-3.5" />
        Marcar reunião
      </button>

      <dialog
        ref={dialogRef}
        className="fixed inset-0 m-0 hidden h-full max-h-none w-full max-w-none open:flex items-center justify-center bg-transparent p-4 text-zinc-100 backdrop:bg-black/60"
      >
        <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
            <h2 className="truncate pr-2 text-sm font-semibold">
              Marcar reunião · {lead.nome}
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="shrink-0 text-zinc-500 hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <MarcarReuniaoForm
            key={openCount}
            leadId={lead.id}
            onScheduled={onScheduled}
            onDone={() => dialogRef.current?.close()}
          />
        </div>
      </dialog>
    </>
  );
}

function MarcarReuniaoForm({
  leadId,
  onScheduled,
  onDone,
}: {
  leadId: string;
  onScheduled?: () => void;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    agendarReuniao.bind(null, leadId),
    undefined
  );
  const [dataHoraLocal, setDataHoraLocal] = useState("");
  useActionToast(state, {
    success: "Reunião marcada.",
    onSuccess: () => {
      onScheduled?.();
      onDone();
    },
  });

  return (
    <form
      action={formAction}
      className="max-h-[calc(100vh-8rem)] space-y-4 overflow-y-auto px-5 py-4"
    >
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400">Data e hora *</label>
        <input
          type="datetime-local"
          required
          value={dataHoraLocal}
          onChange={(e) => setDataHoraLocal(e.target.value)}
          className={FIELD}
        />
        {/* The browser's local time becomes an absolute instant here, so the
            server never has to guess the vendedor's timezone. */}
        <input
          type="hidden"
          name="data_hora"
          value={datetimeLocalToISO(dataHoraLocal) ?? ""}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">
            Duração (min) *
          </label>
          <input
            name="duracao_min"
            type="number"
            required
            min={5}
            max={480}
            step={5}
            defaultValue={30}
            className={FIELD}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">Canal *</label>
          <select name="canal" defaultValue="video" className={FIELD}>
            {REUNIAO_CANAIS.map((canal) => (
              <option key={canal} value={canal}>
                {REUNIAO_CANAL_LABEL[canal]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400">
          Link ou local
        </label>
        <input
          name="local_link"
          placeholder="https://meet.google.com/... ou endereço"
          maxLength={500}
          className={FIELD}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400">Observações</label>
        <textarea
          name="observacoes"
          rows={3}
          maxLength={2000}
          className={`${FIELD} resize-none`}
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
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
          {pending ? "Agendando..." : "Agendar"}
        </button>
      </div>
    </form>
  );
}
