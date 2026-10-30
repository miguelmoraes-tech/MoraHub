"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { responderSolicitacaoAcesso } from "@/lib/actions/vendedor-codigo";
import { useToast } from "@/components/toast";
import { formatDate } from "@/lib/format";
import { textoConfirmarCofundador, type PedidoCofundador } from "@/lib/socios-shared";

/**
 * Pedidos de cofundador pendentes (solicitacoes_vendedor com papel_solicitado = 'cofundador'). Aprovar abre
 * uma confirmação: cofundador tem o MESMO poder do fundador. Com 2+ fundadores a resposta vira um pedido de
 * aprovação de todos em /aprovacoes (a RPC retorna sem executar).
 */
export function PedidosCofundador({
  pedidos,
  qtdFundadores,
}: {
  pedidos: PedidoCofundador[];
  qtdFundadores: number;
}) {
  const toast = useToast();
  const [pendente, iniciar] = useTransition();
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function responder(p: PedidoCofundador, aprovar: boolean) {
    setErro(null);
    iniciar(async () => {
      const r = await responderSolicitacaoAcesso(p.id, aprovar);
      setConfirmando(null);
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      if (r.pendente) {
        toast.aprovacao();
        return;
      }
      toast.success(aprovar ? "Cofundador aprovado. A empresa já aparece para ele." : "Pedido recusado.");
    });
  }

  return (
    <section className="space-y-2">
      <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-600">
        Pedidos de cofundador pendentes ({pedidos.length})
      </h2>
      {pedidos.length === 0 ? (
        <p className="text-xs text-zinc-600">
          Nenhum pedido. Quando alguém digitar o código de cofundador, o pedido aparece aqui (e no sino).
        </p>
      ) : (
        pedidos.map((p) => (
          <div key={p.id} className="space-y-3 rounded-xl border border-copper-600/30 bg-copper-600/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-100">{p.email ?? "Sem e-mail"}</p>
                <p className="text-xs text-zinc-500">
                  Pediu para entrar como <strong className="text-copper-300">COFUNDADOR</strong> em{" "}
                  {formatDate(p.createdAt.slice(0, 10))}
                </p>
              </div>
              {confirmando !== p.id && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmando(p.id)}
                    disabled={pendente}
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
                  >
                    Aprovar
                  </button>
                  <button
                    type="button"
                    onClick={() => responder(p, false)}
                    disabled={pendente}
                    className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400 disabled:opacity-60"
                  >
                    Recusar
                  </button>
                </div>
              )}
            </div>

            {confirmando === p.id && (
              <div role="alertdialog" aria-label="Confirmar cofundador" className="space-y-3 rounded-lg border border-amber-900/50 bg-amber-950/30 p-3">
                <p className="text-sm text-amber-200">{textoConfirmarCofundador(p.email)}</p>
                {qtdFundadores >= 2 && (
                  <p className="text-xs text-amber-300">
                    A empresa tem {qtdFundadores} fundadores: a sua aprovação não executa na hora. O pedido vai para aprovação de
                    todos em <Link href="/aprovacoes" className="underline">Aprovações</Link> e só vira cofundador quando todos aprovarem.
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => responder(p, true)}
                    disabled={pendente}
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
                  >
                    {pendente ? "Enviando..." : "Confirmar e aprovar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmando(null)}
                    disabled={pendente}
                    className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200"
                  >
                    Voltar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
      {erro && (
        <p className="rounded-lg border border-rose-900/50 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">{erro}</p>
      )}
    </section>
  );
}
