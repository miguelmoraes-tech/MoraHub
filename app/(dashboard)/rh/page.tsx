import { getRHOverview } from "@/lib/rh/get-overview";
import { getDonoIdAtivo } from "@/lib/empresa-ativa";
import { VisaoGeralRH } from "@/components/rh/visao-geral-rh";

export default async function RHPage() {
  const donoId = await getDonoIdAtivo();
  const overview = await getRHOverview(donoId);

  return <VisaoGeralRH overview={overview} />;
}
