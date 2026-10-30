"use client";

import { useCallback, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, RefreshCw, XCircle } from "lucide-react";
import { verificarSolicitacaoVendedor } from "@/lib/actions/vendedor-codigo";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/format";
import { ACESSO_VENDEDOR_CODIGO } from "@/lib/vendedor-access";
import { NOVA_EMPRESA } from "@/lib/empresa";
import {
  SOLICITACAO_POLL_INTERVAL_MS,
  type SolicitacaoVendedorStatus,
} from "@/lib/vendedor-shared";

export function AguardandoAprovacao({
  userId,
  status,
  enviadoEm,
  temEmpresa = false,
}: {
  /** A conta já tem empresa: oferece voltar para ela enquanto espera. */
  temEmpresa?: boolean;
  userId: string;
  status: Exclude<SolicitacaoVendedorStatus, "aprovado">;
  enviadoEm: string;
}) {
  const router = useRouter();
  const [verificando, startTransition] = useTransition();

  // The action activates the company and redirects to the home of the granted
  // papel by itself once the request is approved; when it only reports a
  // different status (e.g. refused), re-render the server page to show it.
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

  // Realtime: the gestor's answer is an UPDATE on this account's own request
  // (RLS limits the rows). The polling above stays as the fallback.
  useEffect(() => {
    if (status !== "pendente") return;
    const supabase = createClient();
    const channel = supabase
      .channel(`minha-solicitacao:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "solicitacoes_vendedor",
          filter: `user_id=eq.${userId}`,
        },
        () => verificar()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [status, userId, verificar]);

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
            O responsável não aprovou o seu acesso. Confira o código com ele e tente
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
          Pedido enviado
        </h1>
        <p className="mt-1 text-sm font-medium text-zinc-300">Aguarde a aprovação do fundador da empresa.</p>
        <p className="mt-1 text-sm text-zinc-500">
          Pedido enviado em{" "}
          {formatDate(enviadoEm.slice(0, 10))}
          . Esta tela se atualiza sozinha quando ele responder; quando for aprovado, a empresa aparece no seu seletor de empresas.
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
      <div className="space-y-2">
        {!temEmpresa && (
          <Link
            href={NOVA_EMPRESA}
            className="flex w-full items-center justify-center rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
          >
            Criar minha própria empresa enquanto isso
          </Link>
        )}
        <Link
          href={`${ACESSO_VENDEDOR_CODIGO}?outro=1`}
          className="flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-200"
        >
          Digitar outro código
        </Link>
        {temEmpresa && (
          <Link href="/" className="block text-xs font-medium text-zinc-400 hover:text-zinc-200">
            Voltar para a minha empresa
          </Link>
        )}
      </div>
    </div>
  );
}
