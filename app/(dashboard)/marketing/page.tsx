import { getMarketingOverview } from "@/lib/marketing/get-overview";
import { getAcessoModulo } from "@/lib/empresa-ativa";
import { VisaoGeralMarketing } from "@/components/marketing/visao-geral-marketing";

export default async function MarketingPage() {
  const acesso = await getAcessoModulo("marketing");
  const overview = await getMarketingOverview(acesso);

  return <VisaoGeralMarketing overview={overview} />;
}
