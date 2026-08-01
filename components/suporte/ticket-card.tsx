import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { StatusChip, type ChipTone } from "@/components/status-chip";
import { formatDate } from "@/lib/format";
import { isSlaEstourado } from "@/lib/tickets";
import type { Ticket } from "@/lib/types";

const CATEGORIA_LABEL: Record<Ticket["categoria"], string> = {
  tecnico: "Técnico",
  financeiro: "Financeiro",
  juridico: "Jurídico",
  contabil: "Contábil",
  geral: "Geral",
  outro: "Outro",
};

const PRIORIDADE_LABEL: Record<Ticket["prioridade"], string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

const PRIORIDADE_TONE: Record<Ticket["prioridade"], ChipTone> = {
  baixa: "zinc",
  media: "sky",
  alta: "amber",
  urgente: "rose",
};

export function TicketCard({
  ticket,
  nowMs,
  clienteNome,
  donoNome,
  responsavelNome,
}: {
  ticket: Ticket;
  /** Passed down from the server render so SLA state is deterministic and
   * matches between SSR and hydration — never computed from a live clock
   * inside this (otherwise client) component tree. */
  nowMs: number;
  clienteNome?: string;
  donoNome?: string;
  responsavelNome?: string;
}) {
  const estourado = isSlaEstourado(ticket, nowMs);

  return (
    <Link
      href={`/suporte/${ticket.id}`}
      className={`flex flex-col gap-2 rounded-xl border p-4 transition-colors hover:bg-zinc-900 ${
        estourado
          ? "border-rose-800/60 bg-rose-950/10"
          : "border-zinc-800 bg-zinc-900/50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="truncate text-sm font-semibold text-zinc-100">
          {ticket.titulo}
        </h3>
        <StatusChip tone={PRIORIDADE_TONE[ticket.prioridade]}>
          {PRIORIDADE_LABEL[ticket.prioridade]}
        </StatusChip>
      </div>

      {ticket.descricao && (
        <p className="line-clamp-2 text-xs leading-relaxed text-zinc-500">
          {ticket.descricao}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <StatusChip tone="copper">{CATEGORIA_LABEL[ticket.categoria]}</StatusChip>
        {estourado && (
          <StatusChip tone="rose">
            <AlertTriangle className="h-3 w-3" />
            SLA estourado
          </StatusChip>
        )}
      </div>

      <p className="text-xs text-zinc-600">
        {clienteNome && `${clienteNome} · `}
        {donoNome && `${donoNome} · `}
        aberto em {formatDate(ticket.data_abertura.slice(0, 10))}
        {responsavelNome && ` · ${responsavelNome}`}
      </p>
    </Link>
  );
}
