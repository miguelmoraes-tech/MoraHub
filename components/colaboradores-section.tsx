"use client";

import { useState } from "react";
import { UserCheck } from "lucide-react";
import type { ColaboradorPapel, ColaboradorVinculado, Convite } from "@/lib/types";
import {
  removerColaborador,
  cancelarConvite,
} from "@/app/(dashboard)/juridico/actions";
import { formatDate } from "@/lib/format";
import { StatusChip, type ChipTone } from "@/components/status-chip";
import { ConviteColaboradorDialog } from "@/components/convite-colaborador-dialog";
import { ChatLink } from "@/components/chat/chat-link";

const PAPEL_LABEL: Record<ColaboradorPapel, string> = {
  contador: "Contador",
  advogado: "Advogado",
  financeiro: "Financeiro",
};

const CONVITE_STATUS_LABEL: Record<Convite["status"], string> = {
  pendente: "Pendente",
  aceito: "Aceito",
  recusado: "Recusado",
  expirado: "Expirado",
};

const CONVITE_STATUS_TONE: Record<Convite["status"], ChipTone> = {
  pendente: "amber",
  aceito: "emerald",
  recusado: "rose",
  expirado: "zinc",
};

type Confirmando = { tipo: "colaborador" | "convite"; id: string } | null;

export function ColaboradoresSection({
  convites,
  colaboradores,
  conversaByColaborador,
  unreadByConversa,
  currentUserId,
}: {
  convites: Convite[];
  colaboradores: ColaboradorVinculado[];
  conversaByColaborador: Map<string, string>;
  unreadByConversa: Map<string, number>;
  currentUserId: string;
}) {
  const [confirmando, setConfirmando] = useState<Confirmando>(null);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <UserCheck className="h-4 w-4 text-zinc-500" />
          Colaboradores
        </div>
        <ConviteColaboradorDialog />
      </div>

      <div className="mb-5 space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-600">
          Colaboradores vinculados
        </p>
        {colaboradores.length > 0 ? (
          colaboradores.map((c) => {
            const confirmandoEste =
              confirmando?.tipo === "colaborador" && confirmando.id === c.id;

            return (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-zinc-200">
                    {c.nome || c.email || "Colaborador"}
                  </p>
                  {c.nome && c.email && (
                    <p className="truncate text-xs text-zinc-500">{c.email}</p>
                  )}
                  <p className="text-xs text-zinc-500">
                    {PAPEL_LABEL[c.papel]} · vinculado em{" "}
                    {formatDate(c.created_at.slice(0, 10))}
                  </p>
                </div>

                {confirmandoEste ? (
                  <div className="flex shrink-0 items-center gap-2 text-xs">
                    <span className="text-zinc-400">Remover acesso?</span>
                    <form action={removerColaborador.bind(null, c.id)}>
                      <button
                        type="submit"
                        className="rounded-md bg-rose-600 px-2 py-1 font-medium text-white hover:bg-rose-500"
                      >
                        Confirmar
                      </button>
                    </form>
                    <button
                      type="button"
                      onClick={() => setConfirmando(null)}
                      className="rounded-md px-2 py-1 font-medium text-zinc-400 hover:text-zinc-200"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="flex shrink-0 items-center gap-1">
                    {conversaByColaborador.has(`${c.membro_id}|${c.papel}`) && (
                      <ChatLink
                        href={`/chat/${conversaByColaborador.get(`${c.membro_id}|${c.papel}`)}`}
                        conversaId={conversaByColaborador.get(`${c.membro_id}|${c.papel}`)!}
                        currentUserId={currentUserId}
                        initialUnread={
                          unreadByConversa.get(
                            conversaByColaborador.get(`${c.membro_id}|${c.papel}`)!
                          ) ?? 0
                        }
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setConfirmando({ tipo: "colaborador", id: c.id })}
                      className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400"
                    >
                      Remover acesso
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <p className="text-xs text-zinc-600">
            Nenhum colaborador com acesso ainda.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-600">
          Convites
        </p>
        {convites.length > 0 ? (
          convites.map((convite) => {
            const confirmandoEste =
              confirmando?.tipo === "convite" && confirmando.id === convite.id;

            return (
              <div
                key={convite.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-zinc-200">
                    {convite.email_convidado}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {PAPEL_LABEL[convite.papel]} · enviado em{" "}
                    {formatDate(convite.created_at.slice(0, 10))}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {convite.status === "pendente" &&
                    (confirmandoEste ? (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-zinc-400">Cancelar convite?</span>
                        <form action={cancelarConvite.bind(null, convite.id)}>
                          <button
                            type="submit"
                            className="rounded-md bg-rose-600 px-2 py-1 font-medium text-white hover:bg-rose-500"
                          >
                            Confirmar
                          </button>
                        </form>
                        <button
                          type="button"
                          onClick={() => setConfirmando(null)}
                          className="rounded-md px-2 py-1 font-medium text-zinc-400 hover:text-zinc-200"
                        >
                          Voltar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmando({ tipo: "convite", id: convite.id })
                        }
                        className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400"
                      >
                        Cancelar
                      </button>
                    ))}
                  <StatusChip tone={CONVITE_STATUS_TONE[convite.status]}>
                    {CONVITE_STATUS_LABEL[convite.status]}
                  </StatusChip>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-xs text-zinc-600">Nenhum convite enviado ainda.</p>
        )}
      </div>
    </div>
  );
}
