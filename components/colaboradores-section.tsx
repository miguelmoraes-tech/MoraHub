"use client";

import { UserCheck } from "lucide-react";
import type { ColaboradorPapel, ColaboradorVinculado, Convite } from "@/lib/types";
import { removerColaborador } from "@/app/(dashboard)/juridico/actions";
import { formatDate } from "@/lib/format";
import { StatusChip, type ChipTone } from "@/components/status-chip";
import { ConviteColaboradorDialog } from "@/components/convite-colaborador-dialog";

const PAPEL_LABEL: Record<ColaboradorPapel, string> = {
  contador: "Contador",
  advogado: "Advogado",
};

const CONVITE_STATUS_LABEL: Record<Convite["status"], string> = {
  pendente: "Pendente",
  aceito: "Aceito",
  recusado: "Recusado",
  expirado: "Expirado",
};

const CONVITE_STATUS_TONE: Record<Convite["status"], ChipTone> = {
  pendente: "amber",
  aceito: "emerald",
  recusado: "rose",
  expirado: "zinc",
};

export function ColaboradoresSection({
  convites,
  colaboradores,
}: {
  convites: Convite[];
  colaboradores: ColaboradorVinculado[];
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <UserCheck className="h-4 w-4 text-zinc-500" />
          Colaboradores externos
        </div>
        <ConviteColaboradorDialog />
      </div>

      {colaboradores.length > 0 && (
        <div className="mb-5 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-600">
            Com acesso
          </p>
          {colaboradores.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-zinc-200">
                  {c.nome || c.email || "Colaborador"}
                </p>
                <p className="text-xs text-zinc-500">{PAPEL_LABEL[c.papel]}</p>
              </div>
              <form action={removerColaborador.bind(null, c.id)}>
                <button
                  type="submit"
                  className="shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400"
                >
                  Remover
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-600">
          Convites
        </p>
        {convites.length > 0 ? (
          convites.map((convite) => (
            <div
              key={convite.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-zinc-200">
                  {convite.email_convidado}
                </p>
                <p className="text-xs text-zinc-500">
                  {PAPEL_LABEL[convite.papel]} · enviado em{" "}
                  {formatDate(convite.created_at.slice(0, 10))}
                </p>
              </div>
              <StatusChip tone={CONVITE_STATUS_TONE[convite.status]}>
                {CONVITE_STATUS_LABEL[convite.status]}
              </StatusChip>
            </div>
          ))
        ) : (
          <p className="text-xs text-zinc-600">Nenhum convite enviado ainda.</p>
        )}
      </div>
    </div>
  );
}
