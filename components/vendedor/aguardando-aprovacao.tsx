"use client";

import { useCallback, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, RefreshCw, XCircle } from "lucide-react";
import { verificarSolicitacaoVendedor } from "@/lib/actions/vendedor-codigo";
import { formatDate } from "@/lib/format";
import { ACESSO_VENDEDOR_CODIGO } from "@/lib/vendedor-access";
import {
  SOLICITACAO_POLL_INTERVAL_MS,
  type SolicitacaoVendedorStatus,
} from "@/lib/vendedor-shared";

export function AguardandoAprovacao({
  status,
  enviadoEm,
}: {
  status: Exclude<SolicitacaoVendedorStatus, "aprovado">;
  enviadoEm: string;
}) {
  const router = useRouter();
  const [verificando, startTransition] = useTransition();

  // The action redirects to the vendedor area by itself once the link is
  // active; when it only reports a different status (e.g. refused), re-render
  // the server page to show it.
  const verificar = useCallback(() => {
    startTransition(async () => {
      const resultado = await verificarSolicitacaoVendedor();
      if (resultado.status !== status) router.refresh();
    });
  }, [status, router]);

  useEffect(() => {
    if (status !== "pendente") return;
    const id = setInterval(() => {
      if (!document.hidden) verificar();
    }, SOLICITACAO_POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [status, verificar]);

  if (status === "recusado") {
    return (
      <div className="space-y-6 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-rose-500/20 text-rose-300">
          <XCircle className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-50">
            Solicitação recusada
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            O gestor não aprovou o seu acesso. Confira o código com ele e tente
            novamente.
          </p>
        </div>
        <Link
          href={ACESSO_VENDEDOR_CODIGO}
          className="inline-block w-full rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-500"
        >
          Digitar outro código
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-center">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/20 text-amber-300">
        <Clock className="h-5 w-5" />
      </span>
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-50">
          Aguardando aprovação do gestor
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Pedido enviado em{" "}
          {formatDate(enviadoEm.slice(0, 10))}
          . Esta tela se atualiza sozinha quando ele responder.
        </p>
      </div>
      <button
        type="button"
        onClick={verificar}
        disabled={verificando}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw className={`h-4 w-4 ${verificando ? "animate-spin" : ""}`} />
        {verificando ? "Verificando..." : "Verificar"}
      </button>
    </div>
  );
}
