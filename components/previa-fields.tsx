"use client";

import { useState } from "react";
import type { Lead } from "@/lib/types";

export function PreviaFields({ lead }: { lead?: Lead }) {
  const [previaEnviada, setPreviaEnviada] = useState(
    lead?.previa_enviada ?? false
  );

  return (
    <div className="space-y-1.5 rounded-lg border border-zinc-800 bg-zinc-950/60 p-2.5">
      <input type="hidden" name="previa_section" value="true" />
      <label className="flex items-center gap-2 text-sm text-zinc-200">
        <input
          type="checkbox"
          name="previa_enviada"
          checked={previaEnviada}
          onChange={(e) => setPreviaEnviada(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 accent-copper-600"
        />
        Prévia enviada?
      </label>
      {previaEnviada && (
        <div className="space-y-1 pt-1">
          <label className="text-xs font-medium text-zinc-400">
            Data do envio
          </label>
          <input
            name="data_previa"
            type="date"
            defaultValue={lead?.data_previa ?? ""}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          />
        </div>
      )}
    </div>
  );
}
