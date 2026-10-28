import { getRHOverview } from "@/lib/rh/get-overview";
import { getAcessoSoDono } from "@/lib/empresa-ativa";
import { VisaoGeralRH } from "@/components/rh/visao-geral-rh";

export default async function RHPage() {
  // RH é só do fundador/cofundador: sócio e funcionário nunca chegam aqui.
  const acesso = await getAcessoSoDono("rh");
  const overview = await getRHOverview(acesso?.workspaceId ?? null);

  return <VisaoGeralRH overview={overview} />;
}
