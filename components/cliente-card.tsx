import Link from "next/link";
import { FolderClosed } from "lucide-react";
import type { Cliente, ClienteStatus } from "@/lib/types";
import { StatusChip, type ChipTone } from "@/components/status-chip";

const STATUS_LABEL: Record<ClienteStatus, string> = {
  ativo: "Ativo",
  em_andamento: "Em andamento",
  pausado: "Pausado",
  encerrado: "Encerrado",
};

const STATUS_TONE: Record<ClienteStatus, ChipTone> = {
  ativo: "emerald",
  em_andamento: "sky",
  pausado: "amber",
  encerrado: "zinc",
};

export function ClienteCard({ cliente }: { cliente: Cliente }) {
  const contato = cliente.telefone ?? cliente.contato ?? cliente.email;

  return (
    <Link
      href={`/clientes/${cliente.id}`}
      className="group relative flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 group-hover:bg-zinc-800/80 group-hover:text-copper-400">
            <FolderClosed className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-zinc-100">
              {cliente.nome}
            </h3>
            {contato && (
              <p className="truncate text-xs text-zinc-500">{contato}</p>
            )}
            {cliente.responsavel && (
              <p className="truncate text-xs text-zinc-500">
                Responsável: {cliente.responsavel}
              </p>
            )}
          </div>
        </div>
        <StatusChip tone={STATUS_TONE[cliente.status]}>
          {STATUS_LABEL[cliente.status]}
        </StatusChip>
      </div>

      {cliente.resumo && (
        <p className="line-clamp-2 text-xs leading-relaxed text-zinc-500">
          {cliente.resumo}
        </p>
      )}

      {cliente.segmento && (
        <StatusChip tone="copper">{cliente.segmento}</StatusChip>
      )}
    </Link>
  );
}
