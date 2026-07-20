"use client";

import { useActionState, useState } from "react";
import {
  Pencil,
  Trash2,
  CheckCircle2,
  Globe,
  AtSign,
  ExternalLink,
} from "lucide-react";
import type { Lead } from "@/lib/types";
import {
  updateLead,
  marcarAbordado,
  deleteLead,
} from "@/app/(dashboard)/leads/actions";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { LeadFields } from "@/components/lead-fields";
import { ResultadoFields } from "@/components/resultado-fields";
import { StatusChip } from "@/components/status-chip";

const RESULTADO_LABEL = {
  sem_resposta: "Sem resposta",
  negou: "Negou",
} as const;

export function LeadCard({ lead }: { lead: Lead }) {
  const [mode, setMode] = useState<"view" | "edit" | "marcar">("view");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const updateAction = updateLead.bind(null, lead.id);
  const [updateState, updateFormAction, updatePending] = useActionState(
    updateAction,
    undefined
  );
  useActionSuccess(updateState, () => setMode("view"));

  const marcarAction = marcarAbordado.bind(null, lead.id);
  const [marcarState, marcarFormAction, marcarPending] = useActionState(
    marcarAction,
    undefined
  );
  useActionSuccess(marcarState, () => setMode("view"));

  if (mode === "edit") {
    return (
      <form
        action={updateFormAction}
        className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
      >
        <LeadFields lead={lead} />
        {lead.status === "abordado" && <ResultadoFields lead={lead} />}
        {updateState && "error" in updateState && (
          <p className="text-xs text-rose-400">{updateState.error}</p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setMode("view")}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={updatePending}
            className="rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {updatePending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    );
  }

  if (mode === "marcar") {
    return (
      <form
        action={marcarFormAction}
        className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
      >
        <p className="text-sm font-medium text-zinc-200">
          Marcar &quot;{lead.nome}&quot; como abordado
        </p>
        <ResultadoFields />
        {marcarState && "error" in marcarState && (
          <p className="text-xs text-rose-400">{marcarState.error}</p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setMode("view")}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={marcarPending}
            className="rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {marcarPending ? "Salvando..." : "Confirmar"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-zinc-100">
            {lead.nome}
          </h3>
          {lead.contato && (
            <p className="truncate text-xs text-zinc-500">{lead.contato}</p>
          )}
        </div>
        <StatusChip tone={lead.status === "abordado" ? "emerald" : "amber"}>
          {lead.status === "abordado" ? "Abordado" : "A abordar"}
        </StatusChip>
      </div>

      {lead.descricao && (
        <p className="line-clamp-2 text-xs leading-relaxed text-zinc-500">
          {lead.descricao}
        </p>
      )}

      {lead.nicho && <StatusChip tone="indigo">{lead.nicho}</StatusChip>}

      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
        {lead.tem_site && (
          <span className="flex items-center gap-1">
            <Globe className="h-3.5 w-3.5" />
            {lead.site_link ? (
              <a
                href={lead.site_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-0.5 hover:text-zinc-300"
              >
                Site <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              "Site"
            )}
          </span>
        )}
        {lead.tem_insta && (
          <span className="flex items-center gap-1">
            <AtSign className="h-3.5 w-3.5" />
            {lead.insta_link ? (
              <a
                href={lead.insta_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-0.5 hover:text-zinc-300"
              >
                Instagram <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              "Instagram"
            )}
          </span>
        )}
      </div>

      {lead.status === "abordado" && lead.resultado && (
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/60 px-3 py-2 text-xs">
          <StatusChip tone={lead.resultado === "negou" ? "rose" : "zinc"}>
            {RESULTADO_LABEL[lead.resultado]}
          </StatusChip>
          {lead.resultado === "negou" && lead.motivo_negou && (
            <p className="mt-1 text-zinc-500">{lead.motivo_negou}</p>
          )}
        </div>
      )}

      {lead.abordado_por && (
        <p className="text-xs text-zinc-600">abordado por {lead.abordado_por}</p>
      )}

      <div className="mt-auto flex items-center justify-between border-t border-zinc-800/80 pt-3">
        {confirmingDelete ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-400">Excluir?</span>
            <form action={deleteLead.bind(null, lead.id)}>
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
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMode("edit")}
              className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {lead.status === "abordar" && !confirmingDelete && (
          <button
            type="button"
            onClick={() => setMode("marcar")}
            className="flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Marcar como abordado
          </button>
        )}
      </div>
    </div>
  );
}
