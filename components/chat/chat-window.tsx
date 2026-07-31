"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { marcarConversaComoLida } from "@/lib/actions/chat";
import { formatTime } from "@/lib/format";
import type { Mensagem } from "@/lib/types";

function DiaSeparador({ dataISO }: { dataISO: string }) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(dataISO));

  return (
    <div className="my-3 flex items-center justify-center">
      <span className="rounded-full bg-zinc-900 px-3 py-1 text-[11px] font-medium text-zinc-500">
        {label}
      </span>
    </div>
  );
}

function Bubble({ mensagem, minha }: { mensagem: Mensagem; minha: boolean }) {
  return (
    <div className={`flex ${minha ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
          minha
            ? "rounded-br-sm bg-copper-600 text-white"
            : "rounded-bl-sm bg-zinc-800 text-zinc-100"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{mensagem.conteudo}</p>
        <p
          className={`mt-1 text-right text-[10px] ${minha ? "text-copper-100/70" : "text-zinc-500"}`}
        >
          {formatTime(mensagem.created_at)}
        </p>
      </div>
    </div>
  );
}

export function ChatWindow({
  conversaId,
  currentUserId,
  podeEnviar,
  initialMensagens,
}: {
  conversaId: string;
  currentUserId: string;
  podeEnviar: boolean;
  initialMensagens: Mensagem[];
}) {
  const [mensagens, setMensagens] = useState<Mensagem[]>(initialMensagens);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [mensagens.length]);

  useEffect(() => {
    marcarConversaComoLida(conversaId);
  }, [conversaId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`mensagens:${conversaId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensagens",
          filter: `conversa_id=eq.${conversaId}`,
        },
        (payload) => {
          const nova = payload.new as Mensagem;
          setMensagens((prev) =>
            prev.some((m) => m.id === nova.id) ? prev : [...prev, nova]
          );
          if (nova.remetente_id !== currentUserId) {
            marcarConversaComoLida(conversaId);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [conversaId, currentUserId]);

  async function handleSend() {
    const conteudo = texto.trim();
    if (!conteudo || enviando) return;

    setEnviando(true);
    setErro(null);
    const supabase = createClient();
    const { error } = await supabase.from("mensagens").insert({
      conversa_id: conversaId,
      remetente_id: currentUserId,
      conteudo,
    });
    setEnviando(false);

    if (error) {
      setErro("Não foi possível enviar a mensagem. Tente novamente.");
      return;
    }
    // Realtime delivers the inserted row back — don't append it here too.
    setTexto("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  let ultimaData: string | null = null;

  return (
    <div className="flex flex-col">
      <div className="space-y-1 px-4 py-4 pb-24">
        {mensagens.length > 0 ? (
          mensagens.map((mensagem) => {
            const dataMsg = mensagem.created_at.slice(0, 10);
            const mostrarSeparador = dataMsg !== ultimaData;
            ultimaData = dataMsg;
            return (
              <div key={mensagem.id}>
                {mostrarSeparador && <DiaSeparador dataISO={mensagem.created_at} />}
                <div className="py-0.5">
                  <Bubble
                    mensagem={mensagem}
                    minha={mensagem.remetente_id === currentUserId}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <p className="mt-8 text-center text-xs text-zinc-600">
            Nenhuma mensagem ainda. Diga oi 👋
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 border-t border-zinc-800 bg-zinc-950/95 p-3 backdrop-blur">
        {!podeEnviar ? (
          <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-xs text-zinc-500">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            Este vínculo foi encerrado, você não pode mais enviar mensagens
            aqui.
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Escreva uma mensagem..."
              className="max-h-32 min-h-[2.5rem] w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={enviando || texto.trim() === ""}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-copper-600 text-white transition-colors hover:bg-copper-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        )}
        {erro && <p className="mt-2 text-xs text-rose-400">{erro}</p>}
      </div>
    </div>
  );
}
