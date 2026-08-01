"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Send, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { responderTicket } from "@/app/(dashboard)/suporte/actions";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { formatTime, formatDate } from "@/lib/format";
import { StatusChip } from "@/components/status-chip";
import type { TicketResposta } from "@/lib/types";

function DiaSeparador({ dataISO }: { dataISO: string }) {
  return (
    <div className="my-3 flex items-center justify-center">
      <span className="rounded-full bg-zinc-900 px-3 py-1 text-[11px] font-medium text-zinc-500">
        {formatDate(dataISO.slice(0, 10))}
      </span>
    </div>
  );
}

function Bubble({
  resposta,
  autorNome,
  minha,
}: {
  resposta: TicketResposta;
  autorNome: string;
  minha: boolean;
}) {
  return (
    <div className={`flex ${minha ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
          resposta.interna
            ? "rounded-bl-sm border border-amber-800/50 bg-amber-950/30 text-amber-100"
            : minha
              ? "rounded-br-sm bg-copper-600 text-white"
              : "rounded-bl-sm bg-zinc-800 text-zinc-100"
        }`}
      >
        <div className="mb-0.5 flex items-center gap-1.5">
          <span
            className={`text-xs font-medium ${minha && !resposta.interna ? "text-copper-100/90" : "text-zinc-400"}`}
          >
            {autorNome}
          </span>
          {resposta.interna && <StatusChip tone="amber">Interna</StatusChip>}
        </div>
        <p className="whitespace-pre-wrap break-words">{resposta.conteudo}</p>
        <p
          className={`mt-1 text-right text-[10px] ${minha && !resposta.interna ? "text-copper-100/70" : "text-zinc-500"}`}
        >
          {formatTime(resposta.created_at)}
        </p>
      </div>
    </div>
  );
}

export function TicketThread({
  ticketId,
  currentUserId,
  podeResponder,
  initialRespostas,
  autorNomeById,
}: {
  ticketId: string;
  currentUserId: string;
  podeResponder: boolean;
  initialRespostas: TicketResposta[];
  autorNomeById: Record<string, string>;
}) {
  const [respostas, setRespostas] = useState<TicketResposta[]>(initialRespostas);
  const [interna, setInterna] = useState(false);
  const [state, formAction, pending] = useActionState(
    responderTicket.bind(null, ticketId),
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useActionSuccess(state, () => {
    formRef.current?.reset();
    setInterna(false);
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [respostas.length]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`ticket_respostas:${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_respostas",
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          const nova = payload.new as TicketResposta;
          setRespostas((prev) =>
            prev.some((r) => r.id === nova.id) ? prev : [...prev, nova]
          );
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [ticketId]);

  let ultimaData: string | null = null;

  return (
    <div className="flex flex-col">
      <div className="space-y-1 py-2">
        {respostas.length > 0 ? (
          respostas.map((resposta) => {
            const dataResp = resposta.created_at.slice(0, 10);
            const mostrarSeparador = dataResp !== ultimaData;
            ultimaData = dataResp;
            return (
              <div key={resposta.id}>
                {mostrarSeparador && <DiaSeparador dataISO={resposta.created_at} />}
                <div className="py-0.5">
                  <Bubble
                    resposta={resposta}
                    autorNome={autorNomeById[resposta.autor_id] ?? "Usuário"}
                    minha={resposta.autor_id === currentUserId}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <p className="py-6 text-center text-xs text-zinc-600">
            Nenhuma resposta ainda.
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 border-t border-zinc-800 bg-zinc-950/95 pt-3 backdrop-blur">
        {!podeResponder ? (
          <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-xs text-zinc-500">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            Você não tem acesso para responder este ticket.
          </div>
        ) : (
          <form ref={formRef} action={formAction} className="space-y-2">
            <textarea
              name="conteudo"
              required
              rows={2}
              placeholder="Escreva uma resposta..."
              className="max-h-32 min-h-[2.5rem] w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs text-zinc-500">
                <input
                  type="checkbox"
                  name="interna"
                  checked={interna}
                  onChange={(e) => setInterna(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900"
                />
                Nota interna (só a equipe vê)
              </label>
              <button
                type="submit"
                disabled={pending}
                className="flex items-center gap-1.5 rounded-lg bg-copper-600 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-copper-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {pending ? "Enviando..." : "Enviar"}
              </button>
            </div>
            {state && "error" in state && (
              <p className="text-xs text-rose-400">{state.error}</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
