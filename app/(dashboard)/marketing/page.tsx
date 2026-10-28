import { getMarketingOverview } from "@/lib/marketing/get-overview";
import { getDonoIdAtivo } from "@/lib/empresa-ativa";
import { VisaoGeralMarketing } from "@/components/marketing/visao-geral-marketing";

export default async function MarketingPage() {
  const donoId = await getDonoIdAtivo();
  const overview = await getMarketingOverview(donoId);

  return <VisaoGeralMarketing overview={overview} />;
}
