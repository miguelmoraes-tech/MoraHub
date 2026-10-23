"use client";

import { useActionState, useState } from "react";
import { CalendarClock, Phone, Plus } from "lucide-react";
import type { FollowupLead } from "@/lib/types";
import { registrarFollowup } from "@/app/(dashboard)/leads/actions";
import { formatDate } from "@/lib/format";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { StatusChip, type ChipTone } from "@/components/status-chip";
import { FollowupFields } from "@/components/followup-fields";
import { diffInDays, todayISO } from "@/lib/vencimentos/dates";

const CANAL_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  ligacao: "Ligação",
  email: "E-mail",
  presencial: "Presencial",
  outro: "Outro",
};

const CANAL_TONE: Record<string, ChipTone> = {
  whatsapp: "emerald",
  ligacao: "sky",
  email: "amber",
  presencial: "copper",
  outro: "zinc",
};

function ordenarFollowups(followups: FollowupLead[]) {
  return [...followups].sort((a, b) => {
    if (a.data_contato !== b.data_contato) {
      return b.data_contato.localeCompare(a.data_contato);
    }
    return b.created_at.localeCompare(a.created_at);
  });
}

function NewFollowupForm({
  leadId,
  intervaloFollowupDias,
  onDone,
}: {
  leadId: string;
  intervaloFollowupDias: number | null;
  onDone: () => void;
}) {
  const action = registrarFollowup.bind(null, leadId);
  const [state, formAction, pending] = useActionState(action, undefined);
  useActionSuccess(state, onDone);

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <FollowupFields intervaloFollowupDias={intervaloFollowupDias} />
      {state && "error" in state && (
        <p className="text-xs text-rose-400">{state.error}</p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
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

export function LeadFollowupSection({
  leadId,
  intervaloFollowupDias,
  followups,
  autoOpenForm = false,
  readOnly = false,
  proximoFollowup = null,
}: {
  leadId: string;
  intervaloFollowupDias: number | null;
  followups: FollowupLead[];
  autoOpenForm?: boolean;
  /** Vendedor view: history + next follow-up only, no "Registrar contato". */
  readOnly?: boolean;
  /** leads.proximo_followup — highlighted at the top (readOnly view). */
  proximoFollowup?: string | null;
}) {
  const [open, setOpen] = useState(autoOpenForm && !readOnly);
  const diasParaProximo = proximoFollowup
    ? diffInDays(todayISO(), proximoFollowup)
    : null;
  const ordenados = ordenarFollowups(followups);
  const ultimo = ordenados[0];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <Phone className="h-4 w-4 text-zinc-500" />
            Follow-up
          </h2>
          {ultimo && (
            <p className="mt-1 text-xs text-zinc-500">
              Último contato: {formatDate(ultimo.data_contato)}
              {ultimo.canal && ` · ${CANAL_LABEL[ultimo.canal]}`}
            </p>
          )}
        </div>
        {!open && !readOnly && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-copper-400 hover:text-copper-300"
          >
            <Plus className="h-3.5 w-3.5" />
            Registrar contato
          </button>
        )}
      </div>

      {readOnly && proximoFollowup && diasParaProximo !== null && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-lg border px-3 py-2.5 ${
            diasParaProximo < 0
              ? "border-rose-900/60 bg-rose-950/30 text-rose-300"
              : diasParaProximo === 0
                ? "border-amber-900/60 bg-amber-950/30 text-amber-300"
                : "border-copper-500/30 bg-copper-500/10 text-copper-300"
          }`}
        >
          <CalendarClock className="h-4 w-4 shrink-0" />
          <p className="text-sm font-semibold">
            Próximo follow-up: {formatDate(proximoFollowup)}
            <span className="ml-2 text-xs font-normal opacity-80">
              {diasParaProximo < 0
                ? `atrasado ${-diasParaProximo}d`
                : diasParaProximo === 0
                  ? "hoje"
                  : `em ${diasParaProximo}d`}
            </span>
          </p>
        </div>
      )}

      {open && !readOnly && (
        <div className="mb-4">
          <NewFollowupForm
            leadId={leadId}
            intervaloFollowupDias={intervaloFollowupDias}
            onDone={() => setOpen(false)}
          />
        </div>
      )}

      {ordenados.length > 0 ? (
        <div className="space-y-2">
          {ordenados.map((f) => (
            <div
              key={f.id}
              className="rounded-lg border border-zinc-800/80 px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                {f.canal && (
                  <StatusChip tone={CANAL_TONE[f.canal]}>
                    {CANAL_LABEL[f.canal]}
                  </StatusChip>
                )}
                <span className="text-xs text-zinc-500">
                  {formatDate(f.data_contato)}
                </span>
              </div>
              {f.resumo && (
                <p className="mt-1.5 text-sm text-zinc-300">{f.resumo}</p>
              )}
              {f.proximo_followup && (
                <p className="mt-1 text-xs text-zinc-600">
                  Próximo follow-up: {formatDate(f.proximo_followup)}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-600">Nenhum contato registrado ainda.</p>
      )}
    </div>
  );
}
