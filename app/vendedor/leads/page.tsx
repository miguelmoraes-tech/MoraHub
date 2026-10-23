import { createClient } from "@/lib/supabase/server";
import { requireVendedor } from "@/lib/vendedor";
import { LeadsBoard } from "@/components/leads-board";
import type { FollowupLead, Lead } from "@/lib/types";

export default async function VendedorLeadsPage() {
  const { workspaceId } = await requireVendedor();
  const supabase = await createClient();

  // Same list the dono sees (RLS: "comercial vinculado le leads", SELECT
  // only), plus the follow-up history, shown read-only. Propostas/campanhas
  // aren't loaded — the vendedor view doesn't show them.
  const [{ data: leads }, { data: followups }] = (await Promise.all([
    supabase
      .from("leads")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("nome"),
    supabase
      .from("followups_lead")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("data_contato", { ascending: false }),
  ])) as [{ data: Lead[] | null }, { data: FollowupLead[] | null }];

  return (
    <LeadsBoard leads={leads ?? []} followups={followups ?? []} readOnly />
  );
}
