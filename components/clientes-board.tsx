"use client";

import { useMemo, useState } from "react";
import { Users } from "lucide-react";
import type { Cliente } from "@/lib/types";
import { ClienteCard } from "@/components/cliente-card";
import { NewClienteDialog } from "@/components/new-cliente-dialog";
import { ExportButton } from "@/components/export-button";
import { SegmentFilter } from "@/components/segment-filter";

export function ClientesBoard({ clientes }: { clientes: Cliente[] }) {
  const [segmento, setSegmento] = useState("");

  const segmentos = useMemo(
    () =>
      [...new Set(clientes.map((c) => c.segmento).filter((s): s is string => !!s))].sort(
        (a, b) => a.localeCompare(b)
      ),
    [clientes]
  );

  const filtrados = segmento
    ? clientes.filter((c) => c.segmento === segmento)
    : clientes;

  const exportHref = segmento
    ? `/api/export/clientes?segmento=${encodeURIComponent(segmento)}`
    : "/api/export/clientes";

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Clientes</h1>
          <p className="text-sm text-zinc-500">
            {filtrados.length} cliente(s) na carteira
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton href={exportHref} />
          <NewClienteDialog />
        </div>
      </div>

      {segmentos.length > 0 && (
        <div className="mb-6">
          <SegmentFilter
            value={segmento}
            options={segmentos}
            allLabel="Todos os segmentos"
            onChange={setSegmento}
          />
        </div>
      )}

      {filtrados.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((cliente) => (
            <ClienteCard key={cliente.id} cliente={cliente} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 py-20 text-center">
          <Users className="h-8 w-8 text-zinc-700" />
          <p className="text-sm text-zinc-500">
            {segmento
              ? "Nenhum cliente neste segmento."
              : "Nenhum cliente cadastrado ainda."}
          </p>
        </div>
      )}
    </div>
  );
}
