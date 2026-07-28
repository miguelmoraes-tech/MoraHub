"use client";

import { useActionState, useRef, useState } from "react";
import {
  Maximize2,
  X,
  Pencil,
  Trash2,
  Globe,
  AtSign,
  ExternalLink,
  Send,
  Phone,
} from "lucide-react";
import type { Lead } from "@/lib/types";
import { updateLead, deleteLead } from "@/app/(dashboard)/leads/actions";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { LeadFields } from "@/components/lead-fields";
import { ResultadoFields } from "@/components/resultado-fields";
import { PreviaFields } from "@/components/previa-fields";
import { StatusChip } from "@/components/status-chip";
import { formatDate } from "@/lib/format";

const RESULTADO_LABEL = {
  sem_resposta: "Sem resposta",
  negou: "Negou",
} as const;

const TIPO_CONTATO_LABEL = {
  whatsapp: "WhatsApp",
  ligacao: "Só ligação",
  ambos: "Ambos",
} as const;

export function LeadDetailDialog({ lead }: { lead: Lead }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const updateAction = updateLead.bind(null, lead.id);
  const [updateState, updateFormAction, updatePending] = useActionState(
    updateAction,
    undefined
  );
  useActionSuccess(updateState, () => setMode("view"));

  function handleClose() {
    setMode("view");
    setConfirmingDelete(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        title="Ver detalhes"
        className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>

      <dialog
        ref={dialogRef}
        onClose={handleClose}
        className="fixed inset-0 m-0 hidden h-full max-h-none w-full max-w-none open:flex items-center justify-center bg-transparent p-4 text-zinc-100 backdrop:bg-black/60"
      >
        <div className="flex max-h-[calc(100vh-4rem)] w-full max-w-lg flex-col overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
            <h2 className="truncate text-sm font-semibold pr-2">
              {mode === "edit" ? "Editar lead" : lead.nome}
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="shrink-0 text-zinc-500 hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-5 py-4">
            {mode === "edit" ? (
              <form action={updateFormAction} className="space-y-4">
                <LeadFields lead={lead} />
                {lead.status === "abordado" && (
                  <>
                    <ResultadoFields lead={lead} />
                    <PreviaFields lead={lead} />
                  </>
                )}
                {updateState && "error" in updateState && (
                  <p className="rounded-lg border border-rose-900/50 bg-rose-950/40 px-3 py-2 text-sm text-rose-300">
                    {updateState.error}
                  </p>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setMode("view")}
                    className="rounded-lg px-3.5 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={updatePending}
                    className="rounded-lg bg-copper-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-copper-500 disabled:opacity-60"
                  >
                    {updatePending ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusChip
                    tone={lead.status === "abordado" ? "emerald" : "amber"}
                  >
                    {lead.status === "abordado" ? "Abordado" : "A abordar"}
                  </StatusChip>
                  {lead.nicho && (
                    <StatusChip tone="copper">{lead.nicho}</StatusChip>
                  )}
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

                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium text-zinc-500">
                      Contato
                    </dt>
                    <dd className="text-sm text-zinc-200">
                      {lead.contato || "Não informado"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-zinc-500">
                      Tipo de contato
                    </dt>
                    <dd className="text-sm text-zinc-200">
                      {TIPO_CONTATO_LABEL[lead.tipo_contato]}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-zinc-500">
                      Abordado por
                    </dt>
                    <dd className="text-sm text-zinc-200">
                      {lead.abordado_por || "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-zinc-500">Site</dt>
                    <dd className="flex items-center gap-1.5 text-sm text-zinc-200">
                      <Globe className="h-3.5 w-3.5 text-zinc-500" />
                      {lead.tem_site ? "Sim" : "Não"}
                      {lead.site_link && (
                        <a
                          href={lead.site_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-0.5 text-copper-400 hover:text-copper-300"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-zinc-500">
                      Instagram
                    </dt>
                    <dd className="flex items-center gap-1.5 text-sm text-zinc-200">
                      <AtSign className="h-3.5 w-3.5 text-zinc-500" />
                      {lead.tem_insta ? "Sim" : "Não"}
                      {lead.insta_link && (
                        <a
                          href={lead.insta_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-0.5 text-copper-400 hover:text-copper-300"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </dd>
                  </div>
                </dl>

                {lead.status === "abordado" && lead.resultado && (
                  <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/60 px-3 py-2.5">
                    <StatusChip
                      tone={lead.resultado === "negou" ? "rose" : "zinc"}
                    >
                      {RESULTADO_LABEL[lead.resultado]}
                    </StatusChip>
                    {lead.resultado === "negou" && lead.motivo_negou && (
                      <p className="mt-1.5 text-sm text-zinc-400">
                        {lead.motivo_negou}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <p className="mb-1 text-xs font-medium text-zinc-500">
                    Descrição
                  </p>
                  {lead.descricao ? (
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-300">
                      {lead.descricao}
                    </p>
                  ) : (
                    <p className="text-sm text-zinc-600">Sem descrição.</p>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3.5">
                  {confirmingDelete ? (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-zinc-400">Excluir este lead?</span>
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
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(true)}
                      className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir lead
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setMode("edit")}
                    className="flex items-center gap-1.5 text-xs font-medium text-copper-400 hover:text-copper-300"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
