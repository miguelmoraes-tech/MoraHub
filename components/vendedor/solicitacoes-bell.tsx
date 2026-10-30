"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Bell, Volume2, VolumeX } from "lucide-react";
import { responderSolicitacaoAcesso } from "@/lib/actions/vendedor-codigo";
import { formatDate } from "@/lib/format";
import { useToast } from "@/components/toast";
import Link from "next/link";
import { useSolicitacoes } from "@/components/vendedor/solicitacoes-provider";
import { useAprovacoes } from "@/components/aprovacoes/aprovacoes-provider";
import { ehPedidoCofundador, rotuloDoPedidoAcesso, textoConfirmarCofundador } from "@/lib/socios-shared";

/**
 * Bell with the pending vendedor access requests (dono). Hidden when there is
 * no SolicitacoesVendedorProvider above it. The popover opens downwards from
 * the header it sits in, so the nearest positioned ancestor must be that header.
 */
export function SolicitacoesBell() {
  const solicitacoes = useSolicitacoes();
  const aprovacoes = useAprovacoes();
  const toast = useToast();
  const [aberto, setAberto] = useState(false);
  const [respondendoId, setRespondendoId] = useState<string | null>(null);
  const [respondendo, startResponder] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function fora(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setAberto(false);
    }
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  if (!solicitacoes) return null;
  const { pendentes, setores, remover, somAtivo, setSomAtivo } = solicitacoes;
  // Pedidos de acesso + aprovações entre fundadores esperando o MEU voto.
  const aprovacoesMinhas = aprovacoes?.minhas ?? 0;
  const total = pendentes.length + aprovacoesMinhas;

  function responder(id: string, aprovar: boolean) {
    // Cofundador tem o mesmo poder do fundador: confirma antes de aprovar.
    const pedido = pendentes.find((p) => p.id === id);
    if (aprovar && pedido && ehPedidoCofundador(pedido) && !window.confirm(textoConfirmarCofundador(pedido.email))) return;
    setRespondendoId(id);
    startResponder(async () => {
      const resultado = await responderSolicitacaoAcesso(id, aprovar);
      setRespondendoId(null);
      if ("error" in resultado) {
        toast.error(resultado.error);
        return;
      }
      // Pendente (2+ fundadores): nada mudou ainda, então o pedido segue na lista.
      if (resultado.pendente) {
        toast.aprovacao();
        return;
      }
      remover(id);
      toast.success(aprovar ? "Acesso aprovado." : "Solicitação recusada.");
    });
  }

  return (
    <div ref={containerRef} className="ml-auto">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-label={
          total > 0
            ? `Notificações: ${total} pendência${total > 1 ? "s" : ""}`
            : "Notificações"
        }
        aria-expanded={aberto}
        className="relative rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
      >
        <Bell className="h-4 w-4" />
        {total > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-copper-600 px-1 text-[10px] font-semibold text-white">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-label="Pedidos de acesso"
          className="absolute left-3 top-full z-50 w-80 max-w-[calc(100vw-1.5rem)] rounded-xl border border-zinc-800 bg-zinc-950 shadow-xl shadow-black/40"
        >
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <p className="text-sm font-semibold text-zinc-100">
              Pedidos de acesso
            </p>
            <button
              type="button"
              onClick={() => setSomAtivo(!somAtivo)}
              title={somAtivo ? "Desligar som" : "Ligar som"}
              aria-label={somAtivo ? "Desligar som" : "Ligar som"}
              aria-pressed={somAtivo}
              className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            >
              {somAtivo ? (
                <Volume2 className="h-3.5 w-3.5" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          <div className="max-h-80 space-y-2 overflow-y-auto p-3">
            {aprovacoesMinhas > 0 && (
              <Link
                href="/aprovacoes"
                onClick={() => setAberto(false)}
                className="block rounded-lg border border-copper-600/40 bg-copper-600/10 px-3 py-2.5 text-sm text-copper-200 hover:bg-copper-600/20"
              >
                {aprovacoesMinhas === 1
                  ? "1 aprovação esperando seu voto"
                  : `${aprovacoesMinhas} aprovações esperando seu voto`}
                <span className="ml-1 text-xs text-copper-300">Ver →</span>
              </Link>
            )}
            {pendentes.length === 0 && aprovacoesMinhas === 0 ? (
              <p className="px-1 py-3 text-center text-xs text-zinc-600">
                Nenhum pedido pendente.
              </p>
            ) : (
              pendentes.map((s) => (
                <div
                  key={s.id}
                  className="rounded-lg border border-zinc-800/80 px-3 py-2.5"
                >
                  <p className="truncate text-sm text-zinc-200">
                    {s.email ?? "Sem e-mail"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {ehPedidoCofundador(s) ? (
                      <strong className="text-copper-300">{rotuloDoPedidoAcesso(s, setores)}</strong>
                    ) : (
                      rotuloDoPedidoAcesso(s, setores)
                    )}
                    {" · "}pediu acesso em {formatDate(s.created_at.slice(0, 10))}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => responder(s.id, true)}
                      disabled={respondendo}
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
                    >
                      {respondendo && respondendoId === s.id
                        ? "Enviando..."
                        : "Aprovar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => responder(s.id, false)}
                      disabled={respondendo}
                      className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400 disabled:opacity-60"
                    >
                      Recusar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
