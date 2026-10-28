import { createClient } from "@/lib/supabase/server";
import { getAcessoModulo, temExtra } from "@/lib/empresa-ativa";
import { getCampanhaMetricsMap, getFontesMetricas } from "@/lib/marketing/campanha-metrics";
import { CampanhasBoard } from "@/components/marketing/campanhas-board";
import type { Campanha } from "@/lib/types";

export default async function MarketingCampanhasPage() {
  const acesso = await getAcessoModulo("marketing");
  const supabase = await createClient();
  const veInvestimento = !!acesso && temExtra(acesso, "investimento");

  const { data: campanhas } = acesso
    ? ((await supabase
        .from("campanhas")
        .select("*")
        .eq("workspace_id", acesso.workspaceId)
        .order("created_at", { ascending: false })) as { data: Campanha[] | null })
    : { data: [] as Campanha[] };

  const campanhasList = campanhas ?? [];
  // Sem o extra "investimento" o valor nem vai para a tela (só interface; não é barreira).
  const campanhasVisiveis = veInvestimento
    ? campanhasList
    : campanhasList.map((c) => ({ ...c, orcamento_planejado: null, valor_gasto: 0 }));
  const metricsMap = acesso
    ? await getCampanhaMetricsMap(
        supabase,
        acesso.workspaceId,
        campanhasList.map((c) => c.id),
        await getFontesMetricas()
      )
    : new Map();

  return (
    <CampanhasBoard
      campanhas={campanhasVisiveis}
      metrics={Object.fromEntries(metricsMap)}
      somenteLeitura={acesso?.nivel !== "edicao"}
      semInvestimento={!veInvestimento}
    />
  );
}
