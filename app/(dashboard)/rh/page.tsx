import { getRHOverview } from "@/lib/rh/get-overview";
import { getAcessoModulo } from "@/lib/empresa-ativa";
import { podeVerSalarios } from "@/lib/rh/salarios";
import { VisaoGeralRH } from "@/components/rh/visao-geral-rh";

export default async function RHPage() {
  // RH por pessoa: fundador/cofundador ou quem tem permissão de leitura (o proxy já barra o resto).
  const acesso = await getAcessoModulo("rh");
  const overview = await getRHOverview(acesso?.workspaceId ?? null);

  // Sem o extra "salarios" os valores da folha nem saem do servidor (só de tela).
  const ver = acesso ? podeVerSalarios(acesso) : false;
  const visivel = ver
    ? overview
    : { ...overview, folhaMes: { ...overview.folhaMes, valorTotal: 0, valorPago: 0 } };

  return <VisaoGeralRH overview={visivel} />;
}
