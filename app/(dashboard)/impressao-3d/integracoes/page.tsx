import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAcessoModulo } from "@/lib/empresa-ativa";
import { HOME_DONO } from "@/lib/modulos/registry";
import { COLUNAS_INTEGRACAO, COLUNAS_INTEGRACAO_ESTADO, lerIntegracoes } from "@/lib/impressao-3d/integracoes";
import { mensagemRpc } from "@/lib/impressao-3d/erros";
import { IntegracoesBoard } from "@/components/impressao-3d/integracoes-board";

/**
 * Integrações (somente estrutura). Só fundador/cofundador altera e vê a configuração; quem tem
 * leitura vê apenas o status (o servidor nem seleciona a coluna `config` para essa pessoa).
 */
export default async function IntegracoesPage() {
  const acesso = await getAcessoModulo("p3d_integracoes");
  if (!acesso) redirect(HOME_DONO);
  const podeEditar = acesso.ehDono && acesso.nivel === "edicao";

  const { data, error } = await (await createClient())
    .from("p3d_integracoes")
    .select(podeEditar ? COLUNAS_INTEGRACAO : COLUNAS_INTEGRACAO_ESTADO)
    .eq("workspace_id", acesso.workspaceId);

  return (
    <IntegracoesBoard
      integracoes={lerIntegracoes(data)}
      erro={error ? mensagemRpc(error, "Não foi possível carregar as integrações.") : null}
      podeEditar={podeEditar}
    />
  );
}
