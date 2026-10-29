"use client";

import { useState, useTransition } from "react";
import { Check, Copy, KeyRound, RefreshCw } from "lucide-react";
import {
  regenerarCodigoVendedor,
  responderSolicitacaoVendedor,
} from "@/lib/actions/vendedor-codigo";
import { formatarCodigoVendedor, type SolicitacaoVendedor } from "@/lib/vendedor-shared";
import { formatDate } from "@/lib/format";
import { useToast } from "@/components/toast";

/**
 * Owner side of "entrar como vendedor com código": the code to hand to the
 * vendedor, and the pending requests to approve or refuse. Active vendedores
 * are listed by ColaboradoresSection right below, same as invited ones.
 */
export function CodigoGestorSection({
  codigo: codigoInicial,
  solicitacoes,
}: {
  codigo: string;
  solicitacoes: SolicitacaoVendedor[];
}) {
  const toast = useToast();
  const [codigo, setCodigo] = useState(codigoInicial);
  const [confirmando, setConfirmando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [gerando, startGerar] = useTransition();
  const [respondendo, startResponder] = useTransition();
  const [respondendoId, setRespondendoId] = useState<string | null>(null);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(formatarCodigoVendedor(codigo));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("Não foi possível copiar. Selecione o código e copie manualmente.");
    }
  }

  function gerarNovo() {
    startGerar(async () => {
      const resultado = await regenerarCodigoVendedor();
      setConfirmando(false);
      if ("error" in resultado) {
        toast.error(resultado.error);
        return;
      }
      // 2+ fundadores: o código novo só nasce depois da aprovação; o atual segue valendo.
      if ("pendente" in resultado) {
        toast.aprovacao();
        return;
      }
      setCodigo(resultado.codigo);
      toast.success("Novo código gerado. O anterior deixou de valer.");
    });
  }

  function responder(id: string, aprovar: boolean) {
    setRespondendoId(id);
    startResponder(async () => {
      const resultado = await responderSolicitacaoVendedor(id, aprovar);
      setRespondendoId(null);
      if ("error" in resultado) {
        toast.error(resultado.error);
        return;
      }
      if (resultado.pendente) toast.aprovacao();
      else toast.success(aprovar ? "Vendedor aprovado." : "Solicitação recusada.");
    });
  }

  return (
    <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
        <KeyRound className="h-4 w-4 text-zinc-500" />
        Código do vendedor
      </div>

      <p className="mb-3 text-xs text-zinc-500">
        Passe este código ao vendedor. Ele cria a conta, digita o código e você
        aprova o acesso aqui.
      </p>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 font-mono text-lg tracking-[0.2em] text-zinc-100 select-all">
          {formatarCodigoVendedor(codigo)}
        </span>
        <button
          type="button"
          onClick={copiar}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
        >
          {copiado ? (
            <Check className="h-4 w-4 text-emerald-400" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copiado ? "Copiado" : "Copiar"}
        </button>

        {confirmando ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-400">O código atual deixa de valer. Gerar novo?</span>
            <button
              type="button"
              onClick={gerarNovo}
              disabled={gerando}
              className="rounded-md bg-rose-600 px-2 py-1 font-medium text-white hover:bg-rose-500 disabled:opacity-60"
            >
              {gerando ? "Gerando..." : "Confirmar"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              disabled={gerando}
              className="rounded-md px-2 py-1 font-medium text-zinc-400 hover:text-zinc-200"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          >
            <RefreshCw className="h-4 w-4" />
            Gerar novo código
          </button>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-600">
          Solicitações pendentes
        </p>
        {solicitacoes.length > 0 ? (
          solicitacoes.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-zinc-200">{s.email ?? "Sem e-mail"}</p>
                <p className="text-xs text-zinc-500">
                  Pediu acesso em {formatDate(s.created_at.slice(0, 10))}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => responder(s.id, true)}
                  disabled={respondendo}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
                >
                  {respondendo && respondendoId === s.id ? "Enviando..." : "Aprovar"}
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
        ) : (
          <p className="text-xs text-zinc-600">Nenhuma solicitação pendente.</p>
        )}
      </div>
    </div>
  );
}
