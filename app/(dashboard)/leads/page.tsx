import { createClient } from "@/lib/supabase/server";
import { getEffectiveDonoIdForComercial } from "@/lib/comercial";
import { LeadsBoard } from "@/components/leads-board";
import { todayISO, subtractDaysISO } from "@/lib/vencimentos/dates";
import type { Lead, Proposta, FollowupLead, Campanha } from "@/lib/types";

export default async function LeadsPage() {
  const supabase = await createClient();
  const donoId = await getEffectiveDonoIdForComercial();
  const noventaDiasAtras = subtractDaysISO(todayISO(), 90);

  const [{ data: leads }, { data: propostas }, { data: followups }, { data: campanhas }] =
    (await Promise.all([
      supabase.from("leads").select("*").eq("user_id", donoId ?? "").order("nome"),
      supabase.from("propostas").select("*").not("lead_id", "is", null),
      supabase
        .from("followups_lead")
        .select("*")
        .eq("user_id", donoId ?? "")
        .order("data_contato", { ascending: false }),
      // Campanhas ativas/recentes — só resolve para dono ou colaborador de
      // marketing vinculado (RLS "dono ou marketing vinculado"); um
      // colaborador comercial vê a lista vazia, o que é esperado.
      supabase
        .from("campanhas")
        .select("id, nome, status, canal")
        .eq("user_id", donoId ?? "")
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
