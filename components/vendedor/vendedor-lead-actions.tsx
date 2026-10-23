"use client";

import type { Lead } from "@/lib/types";
import { MarcarReuniaoDialog } from "@/components/vendedor/marcar-reuniao-dialog";
import { ConverterLeadButton } from "@/components/vendedor/converter-lead-button";

/**
 * The only two things a vendedor can do to a lead: schedule a meeting or
 * convert it into a client. Both are RPC-backed; nothing here edits `leads`.
 */
export function VendedorLeadActions({
  lead,
  onChanged,
  onConverted,
}: {
  lead: Pick<Lead, "id" | "nome" | "status">;
  /** A meeting was scheduled — the list behind the dialog is now stale. */
  onChanged: () => void;
  onConverted: () => void;
}) {
  if (lead.status === "convertido") {
    return (
      <p className="text-xs text-zinc-500">Lead já convertido em cliente.</p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <MarcarReuniaoDialog lead={lead} onScheduled={onChanged} />
      <ConverterLeadButton lead={lead} onConverted={onConverted} />
    </div>
  );
}
