import { getEffectiveDonoIdForRH } from "@/lib/rh";
import { getRHOverview } from "@/lib/rh/get-overview";
import { VisaoGeralRH } from "@/components/rh/visao-geral-rh";

export default async function RHPage() {
  const donoId = await getEffectiveDonoIdForRH();
  const overview = await getRHOverview(donoId);

  return <VisaoGeralRH overview={overview} />;
}
