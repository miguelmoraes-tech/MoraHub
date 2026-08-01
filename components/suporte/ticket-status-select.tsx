"use client";

import { useTransition } from "react";
import { mudarStatusTicket } from "@/app/(dashboard)/suporte/actions";
import type { TicketStatus } from "@/lib/types";

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: "aberto", label: "Aberto" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "aguardando_cliente", label: "Aguardando cliente" },
  { value: "resolvido", label: "Resolvido" },
  { value: "fechado", label: "Fechado" },
];

export function TicketStatusSelect({
  ticketId,
  status,
}: {
  ticketId: string;
  status: TicketStatus;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) => {
        const novoStatus = e.target.value as TicketStatus;
        startTransition(() => {
          mudarStatusTicket(ticketId, novoStatus);
        });
      }}
      className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500 disabled:opacity-60"
    >
      {STATUS_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
