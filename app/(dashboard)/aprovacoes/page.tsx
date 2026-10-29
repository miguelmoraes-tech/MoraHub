import { redirect } from "next/navigation";
import { getEmpresaPainel } from "@/lib/empresa-ativa";
import { HOME_DONO } from "@/lib/modulos/registry";
import { getFundadores } from "@/lib/aprovacoes";
import { fraseDaRegra } from "@/lib/aprovacoes-shared";
import { AprovacoesView } from "@/components/aprovacoes/aprovacoes-view";

/**
 * Aprovações entre fundadores. Só fundador e cofundador (confirmado no
 * servidor; o proxy também barra sócio e funcionário). A lista vem do provider
 * do layout, que a mantém viva por realtime e ao voltar o foco da aba.
 */
export default async function AprovacoesPage() {
  const empresa = await getEmpresaPainel();
  if (!empresa) redirect(HOME_DONO);

  const regra = fraseDaRegra((await getFundadores(empresa.workspaceId)).length);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Aprovações</h1>
        <p className="text-sm text-zinc-500">
          {regra ??
            "Com mais de um fundador, as alterações na empresa esperam aqui a aprovação de todos."}
        </p>
      </div>
      <AprovacoesView meuId={empresa.userId} />
    </div>
  );
}
