"use client";

import { useActionState, useState } from "react";
import { Phone, Plus } from "lucide-react";
import type { FollowupLead } from "@/lib/types";
import { registrarFollowup } from "@/app/(dashboard)/leads/actions";
import { formatDate } from "@/lib/format";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { StatusChip, type ChipTone } from "@/components/status-chip";
import { FollowupFields } from "@/components/followup-fields";

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
}: {
  leadId: string;
  intervaloFollowupDias: number | null;
  followups: FollowupLead[];
  autoOpenForm?: boolean;
}) {
  const [open, setOpen] = useState(autoOpenForm);
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
        {!open && (
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

      {open && (
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
