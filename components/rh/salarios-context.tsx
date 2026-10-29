"use client";

import { createContext, useContext } from "react";

/**
 * O que a pessoa pode fazer no RH, para a interface (ver app/(dashboard)/rh/layout.tsx):
 * - `verSalarios`: extra "Ver salários e folha". Só de tela (lib/rh/salarios.ts): as
 *   páginas já mandam os valores zerados e as actions recusam.
 * - `podeEditar`: nível de edição no RH. Sem ele os botões de criar/editar/excluir somem
 *   (as actions também recusam).
 * O padrão é tudo false, então um board fora do provider nunca mostra valor nem botão.
 */
interface AcessoRh {
  verSalarios: boolean;
  podeEditar: boolean;
}

const RhAcessoContext = createContext<AcessoRh>({ verSalarios: false, podeEditar: false });

export function RhAcessoProvider({
  verSalarios,
  podeEditar,
  children,
}: AcessoRh & { children: React.ReactNode }) {
  return <RhAcessoContext.Provider value={{ verSalarios, podeEditar }}>{children}</RhAcessoContext.Provider>;
}

export function useVerSalarios(): boolean {
  return useContext(RhAcessoContext).verSalarios;
}

export function usePodeEditarRh(): boolean {
  return useContext(RhAcessoContext).podeEditar;
}
