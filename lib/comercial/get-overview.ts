import { createClient } from "@/lib/supabase/server";
import { todayISO, diffInDays } from "@/lib/vencimentos/dates";
import { isFollowupPendente } from "@/lib/leads";
import type { LeadStatus, LeadResultado } from "@/lib/types";

type LeadOverviewRow = {
  id: string;
  nome: string;
  status: LeadStatus;
  resultado: LeadResultado | null;
  proximo_followup: string | null;
};

export interface ComercialOverview {
  leadsPorStatus: Record<LeadStatus, number>;
  totalLeads: number;
  followupsPendentesCount: number;
  followupsPendentesLista: {
    leadId: string;
    leadNome: string;
    proximoFollowup: string;
    diasAtraso: number;
  }[];
}

const LEADS_POR_STATUS_VAZIO: Record<LeadStatus, number> = {
  abordar: 0,
  abordado: 0,
  convertido: 0,
};

export async function getComercialOverview(
  workspaceId: string | null
): Promise<ComercialOverview> {
  const vazio: ComercialOverview = {
    leadsPorStatus: { ...LEADS_POR_STATUS_VAZIO },
    totalLeads: 0,
    followupsPendentesCount: 0,
    followupsPendentesLista: [],
  };
  if (!workspaceId) return vazio;

  const supabase = await createClient();
  const hoje = todayISO();

  const { data: leads } = (await supabase
    .from("leads")
    .select("id, nome, status, resultado, proximo_followup")
    .eq("workspace_id", workspaceId)) as { data: LeadOverviewRow[] | null };

  const leadsList = leads ?? [];

  const leadsPorStatus: Record<LeadStatus, number> = { ...LEADS_POR_STATUS_VAZIO };
  for (const l of leadsList) leadsPorStatus[l.status] += 1;

  const followupsPendentesLista = leadsList
    .filter((l) => isFollowupPendente(l, hoje))
    .map((l) => ({
      leadId: l.id,
      leadNome: l.nome,
      proximoFollowup: l.proximo_followup as string,
      diasAtraso: diffInDays(l.proximo_followup as string, hoje),
    }))
    .sort((a, b) => b.diasAtraso - a.diasAtraso);

  return {
    leadsPorStatus,
    totalLeads: leadsList.length,
    followupsPendentesCount: followupsPendentesLista.length,
    followupsPendentesLista,
  };
}
