import type { Cliente, ColaboradorPapel, ContaVinculada } from "@/lib/types";

/**
 * Pure helpers/types shared between server pages and client colaborador
 * components. Kept separate from lib/colaborador.ts, which imports
 * lib/supabase/server (next/headers) and therefore can't be reached from
 * any client component's import graph.
 */
export interface ClienteVinculado extends Cliente {
  donoNome: string;
}

export function filtrarContasPorPapel(
  contas: ContaVinculada[],
  papel: ColaboradorPapel
) {
  return contas.filter((c) => c.papel === papel);
}

/** Display name for a linked owner account, falling back to their e-mail. */
export function nomeConta(conta: ContaVinculada | undefined) {
  return conta?.dono_nome || conta?.dono_email || "Conta";
}
