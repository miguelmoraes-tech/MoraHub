"use client";

import { useState } from "react";
import type { GastoFixo, GastoCliente, Cliente } from "@/lib/types";
import { GastosFixosSection } from "@/components/gastos-fixos-section";
import { GastosClientesSection } from "@/components/gastos-clientes-section";

export function GastosBoard({
  gastosFixos,
  gastosClientes,
  clientes,
}: {
  gastosFixos: GastoFixo[];
  gastosClientes: GastoCliente[];
  clientes: Cliente[];
}) {
  const [tab, setTab] = useState<"fixos" | "clientes">("fixos");

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-zinc-100">Gastos</h1>
        <p className="text-sm text-zinc-500">
          {gastosFixos.length} gasto(s) fixo(s) · {gastosClientes.length}{" "}
          gasto(s) por cliente
        </p>
      </div>

      <div className="mb-6 inline-flex rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
        <button
          type="button"
          onClick={() => setTab("fixos")}
          className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
            tab === "fixos"
              ? "bg-indigo-600 text-white"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Fixos ({gastosFixos.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("clientes")}
          className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
            tab === "clientes"
              ? "bg-indigo-600 text-white"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Por cliente ({gastosClientes.length})
        </button>
      </div>

      {tab === "fixos" ? (
        <GastosFixosSection gastos={gastosFixos} />
      ) : (
        <GastosClientesSection gastos={gastosClientes} clientes={clientes} />
      )}
    </div>
  );
}
