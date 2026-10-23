import { redirect } from "next/navigation";
import { ACESSO_VENDEDOR_CODIGO } from "@/lib/vendedor-access";
import { requireComercialSemVinculo } from "@/lib/vendedor";
import { AguardandoAprovacao } from "@/components/vendedor/aguardando-aprovacao";

export default async function AguardandoAprovacaoPage() {
  const { ultima } = await requireComercialSemVinculo();

  // Nothing pending or refused to show (never asked, or an approval whose link
  // was removed since): back to typing a code.
  if (!ultima || ultima.status === "aprovado") redirect(ACESSO_VENDEDOR_CODIGO);

  return <AguardandoAprovacao status={ultima.status} enviadoEm={ultima.created_at} />;
}
