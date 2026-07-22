"use client";

import { useMemo, useState } from "react";
import { Target } from "lucide-react";
import type { Lead } from "@/lib/types";
import { LeadCard } from "@/components/lead-card";
import { NewLeadDialog } from "@/components/new-lead-dialog";
import { ExportButton } from "@/components/export-button";
import { SegmentFilter } from "@/components/segment-filter";

export function LeadsBoard({ leads }: { leads: Lead[] }) {
  const [tab, setTab] = useState<"abordar" | "abordado">("abordar");
  const [nicho, setNicho] = useState("");

  const nichos = useMemo(
    () =>
      [...new Set(leads.map((l) => l.nicho).filter((n): n is string => !!n))].sort(
        (a, b) => a.localeCompare(b)
      ),
    [leads]
  );

  const porNicho = nicho ? leads.filter((l) => l.nicho === nicho) : leads;
  const aAbordar = porNicho.filter((lead) => lead.status === "abordar");
  const abordados = porNicho.filter((lead) => lead.status === "abordado");
  const list = tab === "abordar" ? aAbordar : abordados;

  const exportHref = nicho
    ? `/api/export/leads?nicho=${encodeURIComponent(nicho)}`
    : "/api/export/leads";

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Leads</h1>
          <p className="text-sm text-zinc-500">
            {porNicho.length} lead(s) no total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton href={exportHref} />
          <NewLeadDialog />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
          <button
            type="button"
            onClick={() => setTab("abordar")}
            className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === "abordar"
                ? "bg-copper-600 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            A abordar ({aAbordar.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("abordado")}
            className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === "abordado"
                ? "bg-copper-600 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Abordados ({abordados.length})
          </button>
        </div>

        {nichos.length > 0 && (
          <SegmentFilter
            value={nicho}
            options={nichos}
            allLabel="Todos os nichos"
            onChange={setNicho}
          />
        )}
      </div>

      {list.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 py-20 text-center">
          <Target className="h-8 w-8 text-zinc-700" />
          <p className="text-sm text-zinc-500">
            {tab === "abordar"
              ? "Nenhum lead para abordar."
              : "Nenhum lead abordado ainda."}
          </p>
        </div>
      )}
    </div>
  );
}
