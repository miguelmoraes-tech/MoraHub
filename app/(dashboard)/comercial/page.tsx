import { getEffectiveDonoIdForComercial } from "@/lib/comercial";
import { getComercialOverview } from "@/lib/comercial/get-overview";
import { VisaoGeralComercial } from "@/components/comercial/visao-geral-comercial";

export default async function ComercialPage() {
  const donoId = await getEffectiveDonoIdForComercial();
  const overview = await getComercialOverview(donoId);

  return <VisaoGeralComercial overview={overview} />;
}
