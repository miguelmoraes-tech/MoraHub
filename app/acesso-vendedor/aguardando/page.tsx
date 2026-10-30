import { redirect } from "next/navigation";
import { ACESSO_VENDEDOR_CODIGO } from "@/lib/vendedor-access";
import { requireUsuarioComSolicitacao } from "@/lib/vendedor";
import { getEmpresasDoUsuario } from "@/lib/empresa-ativa";
import { entrarSeAprovado } from "@/lib/actions/vendedor-codigo";
import { AguardandoAprovacao } from "@/components/vendedor/aguardando-aprovacao";

export default async function AguardandoAprovacaoPage() {
  const { userId, ultima } = await requireUsuarioComSolicitacao();

  // Never asked: back to typing a code.
  if (!ultima) redirect(ACESSO_VENDEDOR_CODIGO);

  // Already approved: activate that company and go to the home of the papel it
  // granted. Only if the link is gone (removed since) do we land back on the code.
  if (ultima.status === "aprovado") {
    await entrarSeAprovado();
    redirect(ACESSO_VENDEDOR_CODIGO);
  }

  return (
    <AguardandoAprovacao
      userId={userId}
      status={ultima.status}
      enviadoEm={ultima.created_at}
      temEmpresa={(await getEmpresasDoUsuario()).length > 0}
    />
  );
}
