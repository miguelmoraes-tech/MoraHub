import { createClient } from "@/lib/supabase/server";
import { getDonoIdAtivo, getWorkspaceIdAtivo } from "@/lib/empresa-ativa";
import { getCampanhaMetricsMap } from "@/lib/marketing/campanha-metrics";
import { CampanhasBoard } from "@/components/marketing/campanhas-board";
import type { Campanha } from "@/lib/types";

export default async function MarketingCampanhasPage() {
  const donoId = await getDonoIdAtivo();
  const workspaceId = await getWorkspaceIdAtivo();
  const supabase = await createClient();

  const { data: campanhas } = donoId && workspaceId
    ? ((await supabase
        .from("campanhas")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })) as { data: Campanha[] | null })
    : { data: [] as Campanha[] };

  const campanhasList = campanhas ?? [];
  const metricsMap = donoId
    ? await getCampanhaMetricsMap(supabase, donoId, campanhasList.map((c) => c.id))
    : new Map();

  return (
    <CampanhasBoard
      campanhas={campanhasList}
      metrics={Object.fromEntries(metricsMap)}
    />
  );
}
