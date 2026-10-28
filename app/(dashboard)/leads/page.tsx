import { createClient } from "@/lib/supabase/server";
import { getWorkspaceIdAtivo } from "@/lib/empresa-ativa";
import { LeadsBoard } from "@/components/leads-board";
import { todayISO, subtractDaysISO } from "@/lib/vencimentos/dates";
import type { Lead, Proposta, FollowupLead, Campanha } from "@/lib/types";

export default async function LeadsPage() {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceIdAtivo();
  const noventaDiasAtras = subtractDaysISO(todayISO(), 90);

  const [{ data: leads }, { data: propostas }, { data: followups }, { data: campanhas }] =
    (await Promise.all([
      supabase
        .from("leads")
        .select("*")
        .eq("workspace_id", workspaceId ?? "")
        .order("nome"),
      supabase
        .from("propostas")
        .select("*")
        .eq("workspace_id", workspaceId ?? "")
        .not("lead_id", "is", null),
      supabase
        .from("followups_lead")
        .select("*")
        .eq("workspace_id", workspaceId ?? "")
        .order("data_contato", { ascending: false }),
      // Campanhas ativas/recentes — só resolve para dono ou colaborador de
      // marketing vinculado (RLS "dono ou marketing vinculado"); um
      // colaborador comercial vê a lista vazia, o que é esperado.
      supabase
        .from("campanhas")
        .select("id, nome, status, canal")
        .eq("workspace_id", workspaceId ?? "")
        .or(`status.eq.ativa,created_at.gte.${noventaDiasAtras}`)
        .order("created_at", { ascending: false }),
    ])) as [
      { data: Lead[] | null },
      { data: Proposta[] | null },
      { data: FollowupLead[] | null },
      { data: Pick<Campanha, "id" | "nome" | "status" | "canal">[] | null },
    ];

  return (
    <LeadsBoard
      leads={leads ?? []}
      propostas={propostas ?? []}
      followups={followups ?? []}
      campanhas={campanhas ?? []}
    />
  );
}
