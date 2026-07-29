import { createClient } from "@/lib/supabase/server";
import { LeadsBoard } from "@/components/leads-board";
import type { Lead, Proposta } from "@/lib/types";

export default async function LeadsPage() {
  const supabase = await createClient();

  const [{ data: leads }, { data: propostas }] = (await Promise.all([
    supabase.from("leads").select("*").order("nome"),
    supabase.from("propostas").select("*").not("lead_id", "is", null),
  ])) as [{ data: Lead[] | null }, { data: Proposta[] | null }];

  return <LeadsBoard leads={leads ?? []} propostas={propostas ?? []} />;
}
