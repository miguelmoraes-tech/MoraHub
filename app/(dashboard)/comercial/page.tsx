import { getEffectiveWorkspaceIdForComercial } from "@/lib/comercial";
import { getComercialOverview } from "@/lib/comercial/get-overview";
import { VisaoGeralComercial } from "@/components/comercial/visao-geral-comercial";

export default async function ComercialPage() {
  const workspaceId = await getEffectiveWorkspaceIdForComercial();
  const overview = await getComercialOverview(workspaceId);

  return <VisaoGeralComercial overview={overview} />;
}
