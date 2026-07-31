import { getEffectiveDonoId } from "@/lib/financeiro";
import { getRHOverview } from "@/lib/rh/get-overview";
import { VisaoGeralRH } from "@/components/rh/visao-geral-rh";

export default async function RHPage() {
  const donoId = await getEffectiveDonoId();
  const overview = await getRHOverview(donoId);

  return <VisaoGeralRH overview={overview} />;
}
