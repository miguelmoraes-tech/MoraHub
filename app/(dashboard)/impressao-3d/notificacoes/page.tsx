import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAcessoModulo } from "@/lib/empresa-ativa";
import { HOME_DONO } from "@/lib/modulos/registry";
import { getAbasVisiveis } from "@/lib/modulos/preferencias-servidor";
import { COLUNAS_NOTIFICACAO, lerNotificacoes } from "@/lib/impressao-3d/alertas";
import { mensagemRpc } from "@/lib/impressao-3d/erros";
import { NotificacoesBoard } from "@/components/impressao-3d/notificacoes-board";

const LIMITE = 500;

const MODULOS_DE_REFERENCIA = [
  "p3d_estoque", "p3d_pedidos", "p3d_impressoras", "p3d_orcamentos", "p3d_fornecedores", "p3d_qualidade",
];

/** Histórico de notificações (abertas e resolvidas). Somente leitura; marcar como lida é por RPC. */
export default async function NotificacoesPage() {
  const acesso = await getAcessoModulo("p3d_automacoes");
  if (!acesso) redirect(HOME_DONO);
  const supabase = await createClient();
  const abas = await getAbasVisiveis("p3d_automacoes");

  const [{ data, error }, ...referencias] = await Promise.all([
    supabase
      .from("p3d_notificacoes")
      .select(COLUNAS_NOTIFICACAO)
      .eq("workspace_id", acesso.workspaceId)
      .order("created_at", { ascending: false })
      .limit(LIMITE),
    ...MODULOS_DE_REFERENCIA.map((m) => getAcessoModulo(m)),
  ]);
  // Só vira link o item de um módulo que a pessoa pode abrir.
  const acessiveis = MODULOS_DE_REFERENCIA.filter((_, i) => referencias[i]);
  const notificacoes = lerNotificacoes(data);

  return (
    <NotificacoesBoard
      abas={abas}
      empresaId={acesso.workspaceId}
      notificacoes={notificacoes}
      erro={error ? mensagemRpc(error, "Não foi possível carregar as notificações.") : null}
      truncado={notificacoes.length >= LIMITE}
      acessiveis={acessiveis}
      podeEditar={acesso.nivel === "edicao"}
    />
  );
}
