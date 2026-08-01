import { getEffectiveDonoIdForMarketing } from "@/lib/marketing";
import { getMarketingOverview } from "@/lib/marketing/get-overview";
import { VisaoGeralMarketing } from "@/components/marketing/visao-geral-marketing";

export default async function MarketingPage() {
  const donoId = await getEffectiveDonoIdForMarketing();
  const overview = await getMarketingOverview(donoId);

  return <VisaoGeralMarketing overview={overview} />;
}
