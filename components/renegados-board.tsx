"use client";

import { useMemo, useState } from "react";
import { UserX } from "lucide-react";
import type { Renegado } from "@/lib/types";
import { RenegadoCard } from "@/components/renegado-card";
import { NewRenegadoDialog } from "@/components/new-renegado-dialog";
import { ExportButton } from "@/components/export-button";
import { SegmentFilter } from "@/components/segment-filter";
import { useRotulos } from "@/components/rotulos-provider";

export function RenegadosBoard({
  renegados,
  somenteLeitura = false,
  semExportar = false,
}: {
  renegados: Renegado[];
  /** Sócio/funcionário com leitura: sem criar, editar nem excluir. */
  somenteLeitura?: boolean;
  /** Só o painel completo exporta. */
  semExportar?: boolean;
}) {
  const rotulos = useRotulos();
  const [nicho, setNicho] = useState("");

  const nichos = useMemo(
    () =>
      [...new Set(renegados.map((r) => r.nicho).filter((n): n is string => !!n))].sort(
        (a, b) => a.localeCompare(b)
      ),
    [renegados]
  );

  const filtrados = nicho
    ? renegados.filter((r) => r.nicho === nicho)
    : renegados;

  const exportHref = nicho
    ? `/api/export/renegados?nicho=${encodeURIComponent(nicho)}`
    : "/api/export/renegados";

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">{rotulos.plural("renegados")}</h1>
          <p className="text-sm text-zinc-500">
            {rotulos.texto(
              "renegados",
              `${filtrados.length} renegado(s) registrado(s)`,
              ({ plural }) => `Total de ${plural}: ${filtrados.length}`
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!semExportar && <ExportButton href={exportHref} />}
          {!somenteLeitura && <NewRenegadoDialog />}
        </div>
      </div>

      {nichos.length > 0 && (
        <div className="mb-6">
          <SegmentFilter
            value={nicho}
            options={nichos}
            allLabel="Todos os nichos"
            onChange={setNicho}
          />
        </div>
      )}

      {filtrados.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((renegado) => (
            <RenegadoCard key={renegado.id} renegado={renegado} somenteLeitura={somenteLeitura} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 py-20 text-center">
          <UserX className="h-8 w-8 text-zinc-700" />
          <p className="text-sm text-zinc-500">
            {rotulos.texto(
              "renegados",
              nicho ? "Nenhum renegado neste nicho." : "Nenhum renegado cadastrado ainda.",
              ({ plural }) =>
                nicho
                  ? `Nenhum registro em ${plural} neste nicho.`
                  : `Nenhum cadastro em ${plural} ainda.`
            )}
          </p>
        </div>
      )}
    </div>
  );
}
