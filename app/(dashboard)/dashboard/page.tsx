import { getEffectiveDonoIdGeral } from "@/lib/dono-efetivo";
import { getDashboardExecutivoOverview } from "@/lib/dashboard-executivo/get-overview";
import { DashboardExecutivoBoard } from "@/components/dashboard-executivo/dashboard-executivo-board";

export default async function DashboardExecutivoPage() {
  const donoId = await getEffectiveDonoIdGeral();
  const overview = await getDashboardExecutivoOverview(donoId);

  return <DashboardExecutivoBoard overview={overview} />;
}
