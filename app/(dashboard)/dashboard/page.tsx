import { getDashboardHomeOverview } from "@/lib/dashboard-home/get-overview";
import { DashboardHomeBoard } from "@/components/dashboard-home/dashboard-home-board";

// Home enxuta do dono: só os módulos ligados em lib/modulos-habilitados.ts.
// O Dashboard Executivo completo (getDashboardExecutivoOverview +
// DashboardExecutivoBoard) segue no repositório, sem uso, para ser religado.
export default async function DashboardHomePage() {
  const overview = await getDashboardHomeOverview();

  return <DashboardHomeBoard overview={overview} />;
}
