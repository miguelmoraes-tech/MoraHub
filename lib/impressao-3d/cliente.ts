import { createClient } from "@/lib/supabase/server";
import { getAcessoModulo } from "@/lib/empresa-ativa";
import {
  COLUNAS_ORCAMENTO_CLIENTE, COLUNAS_PEDIDO_CLIENTE, resumirCompras,
  type ComprasDoCliente, type OrcamentoDoCliente, type PedidoDoCliente,
} from "@/lib/impressao-3d/cliente-compras";

export type { ComprasDoCliente };

/**
 * "Pedidos e orçamentos" no detalhe do cliente. Cada lista só é lida com leitura no módulo dono
 * (p3d_pedidos / p3d_orcamentos), sempre pelo workspace_id da empresa ativa. Nenhuma coluna de
 * custo ou lucro é selecionada (o extra "custos" continua escondendo isso).
 */
/** null = nenhum dos dois módulos disponível: a página do cliente fica como antes. */
export async function getComprasDoCliente(clienteId: string): Promise<ComprasDoCliente | null> {
  const [acessoPedidos, acessoOrcamentos] = await Promise.all([
    getAcessoModulo("p3d_pedidos"),
    getAcessoModulo("p3d_orcamentos"),
  ]);
  if (!acessoPedidos && !acessoOrcamentos) return null;
  const supabase = await createClient();
  const [pedidosRes, orcamentosRes] = await Promise.all([
    acessoPedidos
      ? supabase
          .from("p3d_pedidos")
          .select(COLUNAS_PEDIDO_CLIENTE)
          .eq("workspace_id", acessoPedidos.workspaceId)
          .eq("cliente_id", clienteId)
          .order("data_pedido", { ascending: false })
          .limit(200)
      : Promise.resolve({ data: null }),
    acessoOrcamentos
      ? supabase
          .from("p3d_orcamentos")
          .select(COLUNAS_ORCAMENTO_CLIENTE)
          .eq("workspace_id", acessoOrcamentos.workspaceId)
          .eq("cliente_id", clienteId)
          .order("numero", { ascending: false })
          .limit(200)
      : Promise.resolve({ data: null }),
  ]);
  const pedidos = acessoPedidos ? ((pedidosRes.data ?? []) as unknown as PedidoDoCliente[]) : null;
  const orcamentos = acessoOrcamentos ? ((orcamentosRes.data ?? []) as unknown as OrcamentoDoCliente[]) : null;
  return { pedidos, orcamentos, ...resumirCompras(pedidos ?? []) };
}
