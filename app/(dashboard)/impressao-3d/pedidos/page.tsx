import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAcessoModulo } from "@/lib/empresa-ativa";
import { HOME_DONO } from "@/lib/modulos/registry";
import { podeVerCustos } from "@/lib/impressao-3d/regras";
import { getOpcoesClientes } from "@/lib/impressao-3d/opcoes";
import { PedidosBoard } from "@/components/impressao-3d/pedidos-board";
import { COLUNAS_PEDIDO, type Pedido } from "@/lib/impressao-3d/tipos-operacao";
import { hojeSaoPaulo } from "@/lib/impressao-3d/datas";

export default async function PedidosPage() {
  const acesso = await getAcessoModulo("p3d_pedidos");
  if (!acesso) redirect(HOME_DONO);
  const verCustos = podeVerCustos(acesso);

  // Custo e lucro só saem do servidor para quem tem o extra "custos" (só de tela).
  const [{ data }, clientes] = await Promise.all([
    (await createClient())
      .from("p3d_pedidos")
      .select(verCustos ? `${COLUNAS_PEDIDO}, custo_total, lucro_total` : COLUNAS_PEDIDO)
      .eq("workspace_id", acesso.workspaceId)
      .order("numero", { ascending: false }),
    getOpcoesClientes(),
  ]);

  const pedidos = ((data ?? []) as unknown as Partial<Pedido>[]).map((p) => ({
    custo_total: 0,
    lucro_total: 0,
    ...p,
  })) as Pedido[];

  return (
    <PedidosBoard
      pedidos={pedidos}
      clientes={clientes}
      podeEditar={acesso.nivel === "edicao"}
      verCustos={verCustos}
      hoje={hojeSaoPaulo()}
    />
  );
}
