"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Maximize2,
  Eye,
  X,
  Pencil,
  Trash2,
  Globe,
  AtSign,
  ExternalLink,
  Send,
  Phone,
} from "lucide-react";
import type { Lead, Proposta, FollowupLead } from "@/lib/types";
import { updateLead, deleteLead } from "@/app/(dashboard)/leads/actions";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { LeadFields } from "@/components/lead-fields";
import { ResultadoFields } from "@/components/resultado-fields";
import { PreviaFields } from "@/components/previa-fields";
import { StatusChip, type ChipTone } from "@/components/status-chip";
import { ConvertLeadDialog } from "@/components/convert-lead-dialog";
import { PropostasSection } from "@/components/propostas-section";
import { LeadFollowupSection } from "@/components/lead-followup-section";
import { formatDate } from "@/lib/format";
import { LeadContato } from "@/components/lead-contato";
import { VendedorLeadActions } from "@/components/vendedor/vendedor-lead-actions";
import { useLeadViewTracking } from "@/lib/hooks/use-lead-view-tracking";

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

const RESULTADO_LABEL = {
  sem_resposta: "Sem resposta",
  negou: "Negou",
} as const;

const TIPO_CONTATO_LABEL = {
  whatsapp: "WhatsApp",
  ligacao: "Só ligação",
  ambos: "Ambos",
} as const;

export function LeadDetailDialog({
  lead,
  propostas = [],
  followups = [],
  autoOpen = false,
  readOnly = false,
  somenteLeitura = false,
  ocultarContato = false,
  variant = "icone",
}: {
  lead: Lead;
  propostas?: Proposta[];
  followups?: FollowupLead[];
  autoOpen?: boolean;
  /**
   * Vendedor view: no edit/delete/follow-up/proposals; only "Marcar reunião"
   * and "Converter em cliente". Opening the dialog is also audited
   * (lead_view_start / lead_view_ping) while it stays open and visible.
   */
  readOnly?: boolean;
  /** Sócio/funcionário com leitura: dados e histórico de contatos, sem nenhuma ação de escrita. */
  somenteLeitura?: boolean;
  /** Sem o extra "contato": esconde o contato e o campo nos formulários. */
  ocultarContato?: boolean;
  variant?: "icone" | "botao";
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // Mirrors the native <dialog> open state (only needed to drive the tracking
  // hook). Starts true for the search-result auto-open so the effect below
  // doesn't need to set state.
  const [isOpen, setIsOpen] = useState(autoOpen);
  // Set when an action behind the dialog changed the lead; the list is
  // refreshed once the dialog closes (see app/vendedor/actions.ts).
  const stale = useRef(false);

  useLeadViewTracking(lead.id, readOnly && isOpen);

  const updateAction = updateLead.bind(null, lead.id);
  const [updateState, updateFormAction, updatePending] = useActionState(
    updateAction,
    undefined
  );
  useActionSuccess(updateState, () => setMode("view"));

  useEffect(() => {
    if (autoOpen) dialogRef.current?.showModal();
    // Only meant to fire once, right when this card mounts already flagged
    // as the search result to open — not on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleOpen() {
    dialogRef.current?.showModal();
    setIsOpen(true);
  }

  function handleClose() {
    setMode("view");
    setConfirmingDelete(false);
    setIsOpen(false);
    if (stale.current) {
      stale.current = false;
      router.refresh();
    }
  }

  return (
    <>
      {variant === "botao" ? (
        <button
          type="button"
          onClick={handleOpen}
          className="flex items-center gap-1.5 text-xs font-medium text-copper-400 hover:text-copper-300"
        >
          <Eye className="h-3.5 w-3.5" />
          Abrir lead
        </button>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          title="Ver detalhes"
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      )}

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
            {mode === "edit" && !readOnly && !somenteLeitura ? (
              <form action={updateFormAction} className="space-y-4">
                <LeadFields lead={lead} ocultarContato={ocultarContato} />
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
                  <StatusChip tone={STATUS_TONE[lead.status]}>
                    {STATUS_LABEL[lead.status]}
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
                  <LeadContato
                    contato={lead.contato}
                    variant="detalhe"
                    ocultoNoDetalhe={ocultarContato}
                  />
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

                {somenteLeitura ? (
                  <LeadFollowupSection
                    leadId={lead.id}
                    intervaloFollowupDias={lead.intervalo_followup_dias}
                    followups={followups}
                    proximoFollowup={lead.status === "convertido" ? null : lead.proximo_followup}
                    readOnly
                  />
                ) : readOnly ? (
                  <>
                  <LeadFollowupSection
                    leadId={lead.id}
                    intervaloFollowupDias={lead.intervalo_followup_dias}
                    followups={followups}
                    proximoFollowup={lead.status === "convertido" ? null : lead.proximo_followup}
                    readOnly
                  />
                  <div className="border-t border-zinc-800/80 pt-3.5">
                    <VendedorLeadActions
                      lead={lead}
                      onChanged={() => {
                        stale.current = true;
                      }}
                      onConverted={() => {
                        stale.current = true;
                        dialogRef.current?.close();
                      }}
                    />
                  </div>
                  </>
                ) : (
                  <>
                <LeadFollowupSection
                  leadId={lead.id}
                  intervaloFollowupDias={lead.intervalo_followup_dias}
                  followups={followups}
                />

                <PropostasSection leadId={lead.id} propostas={propostas} />

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
                  <div className="flex items-center gap-3">
                    {lead.status !== "convertido" && (
                      <ConvertLeadDialog lead={lead} />
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
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
