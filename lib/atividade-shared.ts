import type { AtividadeVendedorRow } from "@/lib/types";

/**
 * Pure grouping/flagging logic for the "Atividade dos vendedores" report.
 * Shared by the server page (period parsing) and the client board.
 */

export const ATIVIDADE_DIAS_OPCOES = [7, 30, 90] as const;
export type AtividadeDias = (typeof ATIVIDADE_DIAS_OPCOES)[number];
export const ATIVIDADE_DIAS_PADRAO: AtividadeDias = 30;

/** A lead opened this many times (or more) with no meeting/conversion is "sem desfecho". */
export const SEM_DESFECHO_MIN_ABERTURAS = 3;
/** ...or kept open this long in total (5 min) — "tempo alto" without a meeting/conversion. */
export const SEM_DESFECHO_MIN_SEG = 5 * 60;

export function parseDias(value: string | string[] | undefined): AtividadeDias {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return (ATIVIDADE_DIAS_OPCOES as readonly number[]).includes(n)
    ? (n as AtividadeDias)
    : ATIVIDADE_DIAS_PADRAO;
}

export function isSemDesfecho(
  row: Pick<AtividadeVendedorRow, "aberturas" | "total_seg" | "tem_reuniao" | "convertido">
): boolean {
  if (row.tem_reuniao || row.convertido) return false;
  return (
    row.aberturas >= SEM_DESFECHO_MIN_ABERTURAS ||
    row.total_seg >= SEM_DESFECHO_MIN_SEG
  );
}

/** The lead was opened by this vendedor but is assigned to a different one. */
export function isAtribuidoAOutro(
  row: Pick<AtividadeVendedorRow, "vendedor_id" | "lead_atribuido_a">
): boolean {
  return !!row.lead_atribuido_a && row.lead_atribuido_a !== row.vendedor_id;
}

export interface VendedorGrupo {
  vendedor_id: string;
  vendedor_email: string | null;
  leads: AtividadeVendedorRow[];
  totalAberturas: number;
  totalSeg: number;
  semDesfecho: number;
}

export function agruparPorVendedor(rows: AtividadeVendedorRow[]): VendedorGrupo[] {
  const map = new Map<string, VendedorGrupo>();
  for (const row of rows) {
    let grupo = map.get(row.vendedor_id);
    if (!grupo) {
      grupo = {
        vendedor_id: row.vendedor_id,
        vendedor_email: row.vendedor_email,
        leads: [],
        totalAberturas: 0,
        totalSeg: 0,
        semDesfecho: 0,
      };
      map.set(row.vendedor_id, grupo);
    }
    grupo.leads.push(row);
    grupo.totalAberturas += row.aberturas;
    grupo.totalSeg += row.total_seg;
    if (isSemDesfecho(row)) grupo.semDesfecho += 1;
  }
  const grupos = [...map.values()];
  for (const g of grupos) g.leads.sort((a, b) => b.total_seg - a.total_seg);
  return grupos.sort((a, b) => b.totalSeg - a.totalSeg);
}
