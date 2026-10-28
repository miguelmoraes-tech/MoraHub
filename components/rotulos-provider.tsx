"use client";

import { createContext, useContext, useMemo } from "react";
import { criarRotulos, type MapaRotulos, type Rotulos } from "@/lib/rotulos-shared";

// Sem provider (ex.: área do vendedor) = sem rótulo: os textos de sempre.
const RotulosContext = createContext<Rotulos>(criarRotulos());

/** Entrega os rótulos da empresa ativa (lidos no servidor) aos componentes client. */
export function RotulosProvider({
  mapa,
  children,
}: {
  mapa: MapaRotulos;
  children: React.ReactNode;
}) {
  const valor = useMemo(() => criarRotulos(mapa), [mapa]);
  return <RotulosContext.Provider value={valor}>{children}</RotulosContext.Provider>;
}

export function useRotulos(): Rotulos {
  return useContext(RotulosContext);
}
