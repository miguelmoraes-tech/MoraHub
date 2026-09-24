"use client";

import { useActionState, useState } from "react";
import {
  Pencil,
  Trash2,
  Globe,
  AtSign,
  ExternalLink,
  Send,
  Phone,
} from "lucide-react";
import type { Lead, Proposta } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { updateLead, deleteLead } from "@/app/(dashboard)/leads/actions";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { LeadFields } from "@/components/lead-fields";
import { ResultadoFields } from "@/components/resultado-fields";
import { PreviaFields } from "@/components/previa-fields";
import { StatusChip, type ChipTone } from "@/components/status-chip";
import { LeadDetailDialog } from "@/components/lead-detail-dialog";
import { ConvertLeadDialog } from "@/components/convert-lead-dialog";
import { MarcarAbordadoMenu } from "@/components/marcar-abordado-menu";

const RESULTADO_LABEL = {
  sem_resposta: "Sem resposta",
  negou: "Negou",
} as const;

const STATUS_LABEL: Record<Lead["status"], string> = {
  abordar: "A abordar",
  abordado: "Abordado",
  convertido: "Convertido",
};

const STATUS_TONE: Record<Lead["status"], ChipTone> = {
  abordar: "amber",
  abordado: "emerald",
  convertido: "copper",
};

export function LeadCard({
  lead,
  propostas = [],
}: {
  lead: Lead;
  propostas?: Proposta[];
}) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const updateAction = updateLead.bind(null, lead.id);
  const [updateState, updateFormAction, updatePending] = useActionState(
    updateAction,
    undefined
  );
  useActionSuccess(updateState, () => setMode("view"));

  if (mode === "edit") {
    return (
      <form
        action={updateFormAction}
        className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
      >
        <LeadFields lead={lead} />
        {lead.status === "abordado" && (
          <>
            <ResultadoFields lead={lead} />
            <PreviaFields lead={lead} />
          </>
        )}
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
            className="rounded-md bg-copper-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-copper-500 disabled:opacity-60"
          >
            {updatePending ? "Salvando..." : "Salvar"}
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
        <div className="flex shrink-0 items-center gap-1">
          <LeadDetailDialog lead={lead} propostas={propostas} />
          <StatusChip tone={STATUS_TONE[lead.status]}>
            {STATUS_LABEL[lead.status]}
          </StatusChip>
        </div>
      </div>

      {lead.descricao && (
        <p className="line-clamp-2 text-xs leading-relaxed text-zinc-500">
          {lead.descricao}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {lead.nicho && <StatusChip tone="copper">{lead.nicho}</StatusChip>}
        {lead.tipo_contato === "ligacao" && (
          <StatusChip tone="amber">
            <Phone className="h-3 w-3" />
            Só ligação
          </StatusChip>
        )}
        {lead.previa_enviada && (
          <StatusChip tone="sky">
            <Send className="h-3 w-3" />
            Prévia enviada
            {lead.data_previa && ` · ${formatDate(lead.data_previa)}`}
          </StatusChip>
        )}
      </div>

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

        {!confirmingDelete && (
          <div className="flex items-center gap-3">
            {lead.status === "abordar" && (
              <MarcarAbordadoMenu leadId={lead.id} />
            )}
            {lead.status !== "convertido" && (
              <ConvertLeadDialog lead={lead} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
