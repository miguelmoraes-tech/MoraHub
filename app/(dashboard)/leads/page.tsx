import { createClient } from "@/lib/supabase/server";
import { LeadsBoard } from "@/components/leads-board";
import type { Lead } from "@/lib/types";

export default async function LeadsPage() {
  const supabase = await createClient();
  const { data: leads } = (await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })) as { data: Lead[] | null };

  return <LeadsBoard leads={leads ?? []} />;
}
