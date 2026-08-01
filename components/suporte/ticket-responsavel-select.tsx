"use client";

import { useTransition } from "react";
import { atribuirResponsavel } from "@/app/(dashboard)/suporte/actions";
import type { ColaboradorParaAtribuicao } from "@/lib/types";

export function TicketResponsavelSelect({
  ticketId,
  responsavelId,
  colaboradores,
}: {
  ticketId: string;
  responsavelId: string | null;
  colaboradores: ColaboradorParaAtribuicao[];
}) {
  const [pending, startTransition] = useTransition();

  if (colaboradores.length === 0) return null;

  return (
    <select
      value={responsavelId ?? ""}
      disabled={pending}
      onChange={(e) => {
        const novoResponsavel = e.target.value;
        startTransition(() => {
          atribuirResponsavel(ticketId, novoResponsavel);
        });
      }}
      className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500 disabled:opacity-60"
    >
      <option value="">Sem responsável</option>
      {colaboradores.map((colaborador) => (
        <option key={colaborador.membro_id} value={colaborador.membro_id}>
          {colaborador.nome || colaborador.email || "Colaborador"}
        </option>
      ))}
    </select>
  );
}
