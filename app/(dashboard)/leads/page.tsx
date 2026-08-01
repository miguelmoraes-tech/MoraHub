import { createClient } from "@/lib/supabase/server";
import { getEffectiveDonoIdForComercial } from "@/lib/comercial";
import { LeadsBoard } from "@/components/leads-board";
import type { Lead, Proposta, FollowupLead } from "@/lib/types";

export default async function LeadsPage() {
  const supabase = await createClient();
  const donoId = await getEffectiveDonoIdForComercial();

  const [{ data: leads }, { data: propostas }, { data: followups }] = (await Promise.all([
    supabase.from("leads").select("*").eq("user_id", donoId ?? "").order("nome"),
    supabase.from("propostas").select("*").not("lead_id", "is", null),
    supabase
      .from("followups_lead")
      .select("*")
      .eq("user_id", donoId ?? "")
      .order("data_contato", { ascending: false }),
  ])) as [
    { data: Lead[] | null },
    { data: Proposta[] | null },
    { data: FollowupLead[] | null },
  ];

  return (
    <LeadsBoard
      leads={leads ?? []}
      propostas={propostas ?? []}
      followups={followups ?? []}
    />
  );
}
