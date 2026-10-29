import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAcessoModulo } from "@/lib/empresa-ativa";
import { HOME_DONO } from "@/lib/modulos/registry";
import { getOpcoesPedidos } from "@/lib/impressao-3d/opcoes";
import { ExpedicaoBoard } from "@/components/impressao-3d/expedicao-board";
import { COLUNAS_ENVIO, type Envio } from "@/lib/impressao-3d/tipos-operacao";

export default async function ExpedicaoPage() {
  const acesso = await getAcessoModulo("p3d_expedicao");
  if (!acesso) redirect(HOME_DONO);

  const [{ data }, pedidos] = await Promise.all([
    (await createClient())
      .from("p3d_envios")
      .select(COLUNAS_ENVIO)
      .eq("workspace_id", acesso.workspaceId)
      .order("created_at", { ascending: false }),
    // Pedidos (número e cliente) vêm do módulo Pedidos: sem acesso, a tela avisa.
    getOpcoesPedidos(),
  ]);

  return (
    <ExpedicaoBoard
      envios={(data ?? []) as unknown as Envio[]}
      pedidos={pedidos}
      podeEditar={acesso.nivel === "edicao"}
    />
  );
}
