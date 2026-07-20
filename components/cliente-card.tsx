import Link from "next/link";
import { FolderClosed, BadgeCheck } from "lucide-react";
import type { Cliente } from "@/lib/types";
import { StatusChip } from "@/components/status-chip";
import { formatDate } from "@/lib/format";

export function ClienteCard({ cliente }: { cliente: Cliente }) {
  const isPendente = cliente.status === "pendente";

  return (
    <Link
      href={`/clientes/${cliente.id}`}
      className="group relative flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 group-hover:bg-zinc-800/80 group-hover:text-indigo-400">
            <FolderClosed className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-zinc-100">
              {cliente.nome}
            </h3>
            {cliente.contato && (
              <p className="truncate text-xs text-zinc-500">
                {cliente.contato}
              </p>
            )}
          </div>
        </div>
        <StatusChip tone={isPendente ? "amber" : "emerald"}>
          {isPendente ? "Pendente" : "Finalizado"}
        </StatusChip>
      </div>

      {cliente.resumo && (
        <p className="line-clamp-2 text-xs leading-relaxed text-zinc-500">
          {cliente.resumo}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between border-t border-zinc-800/80 pt-3 text-xs text-zinc-500">
        {cliente.assinatura_ativa ? (
          <span className="flex items-center gap-1.5 text-emerald-400">
            <BadgeCheck className="h-3.5 w-3.5" />
            {cliente.assinatura_plano ?? "Assinante"}
          </span>
        ) : (
          <span>Sem assinatura</span>
        )}
        {cliente.assinatura_ativa && cliente.assinatura_vencimento && (
          <span>vence {formatDate(cliente.assinatura_vencimento)}</span>
        )}
      </div>
    </Link>
  );
}
