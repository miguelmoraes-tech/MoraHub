import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAcessoModulo } from "@/lib/empresa-ativa";
import { HOME_DONO } from "@/lib/modulos/registry";
import { COLUNAS_CONFIG_ALERTAS, lerConfigAlertas } from "@/lib/impressao-3d/alertas";
import { mensagemRpc } from "@/lib/impressao-3d/erros";
import { AlertasConfigBoard } from "@/components/impressao-3d/alertas-config-board";

/** Limites dos alertas. A linha nasce no banco na primeira atualização de alertas. */
export default async function ConfigAlertasPage() {
  const acesso = await getAcessoModulo("p3d_automacoes");
  if (!acesso) redirect(HOME_DONO);
  const supabase = await createClient();
  const ws = acesso.workspaceId;

  const ler = () => supabase.from("p3d_config_alertas").select(COLUNAS_CONFIG_ALERTAS).eq("workspace_id", ws).maybeSingle();

  let { data } = await ler();
  let erro: string | null = null;
  // Linha ainda inexistente: p3d_atualizar_alertas a cria (leitura em Automações basta).
  if (!data) {
    const r = await supabase.rpc("p3d_atualizar_alertas", { p_ws: ws });
    if (r.error) erro = mensagemRpc(r.error, "Não foi possível criar a configuração dos alertas.");
    else ({ data } = await ler());
  }

  return (
    <AlertasConfigBoard
      config={lerConfigAlertas(data)}
      erro={erro}
      podeEditar={acesso.nivel === "edicao"}
    />
  );
}
