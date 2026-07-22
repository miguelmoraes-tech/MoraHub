"use client";

import { useState } from "react";
import type { Lead } from "@/lib/types";

export function ResultadoFields({ lead }: { lead?: Lead }) {
  const [resultado, setResultado] = useState(lead?.resultado ?? "sem_resposta");

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Resultado *
        </label>
        <select
          name="resultado"
          required
          value={resultado}
          onChange={(e) =>
            setResultado(e.target.value as "sem_resposta" | "negou")
          }
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          <option value="sem_resposta">Sem resposta</option>
          <option value="negou">Negou</option>
        </select>
      </div>
      {resultado === "negou" && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-400">
            Motivo da negativa *
          </label>
          <input
            name="motivo_negou"
            required
            defaultValue={lead?.motivo_negou ?? ""}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          />
        </div>
      )}
    </div>
  );
}
