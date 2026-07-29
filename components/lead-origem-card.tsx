import Link from "next/link";
import { History } from "lucide-react";
import { formatDate } from "@/lib/format";
import { StatusChip } from "@/components/status-chip";

type LeadOrigem = {
  id: string;
  nome: string;
  descricao: string | null;
  nicho: string | null;
};

export function LeadOrigemCard({
  lead,
  convertidoEm,
}: {
  lead: LeadOrigem;
  convertidoEm: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <History className="h-4 w-4 text-zinc-500" />
          Convertido a partir de um lead
        </h2>
        <Link
          href="/leads"
          className="text-xs font-medium text-copper-400 hover:text-copper-300"
        >
          Ver leads
        </Link>
      </div>
      <p className="text-xs text-zinc-500">
        Lead &quot;{lead.nome}&quot; convertido em {formatDate(convertidoEm)}
        {lead.nicho && (
          <>
            {" "}
            <StatusChip tone="copper">{lead.nicho}</StatusChip>
          </>
        )}
      </p>
      {lead.descricao && (
        <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-zinc-400">
          {lead.descricao}
        </p>
      )}
    </div>
  );
}
