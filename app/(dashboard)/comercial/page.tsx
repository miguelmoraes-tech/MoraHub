import { getComercialOverview } from "@/lib/comercial/get-overview";
import { getWorkspaceIdAtivo } from "@/lib/empresa-ativa";
import { VisaoGeralComercial } from "@/components/comercial/visao-geral-comercial";

export default async function ComercialPage() {
  const workspaceId = await getWorkspaceIdAtivo();
  const overview = await getComercialOverview(workspaceId);

  return <VisaoGeralComercial overview={overview} />;
}
