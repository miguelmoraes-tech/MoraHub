/**
 * Parte pura da seção "Pedidos e orçamentos" do cliente (sem banco): colunas lidas (nenhuma de
 * custo ou lucro), tipos e o resumo de compras. Testada em scripts/testar-acesso.mts.
 */
import type { StatusPedido } from "@/lib/impressao-3d/tipos-operacao";

export const COLUNAS_PEDIDO_CLIENTE = "id, numero, data_pedido, status, total, pago_valor, prazo_entrega";
export const COLUNAS_ORCAMENTO_CLIENTE = "id, numero, titulo, status, total";

export interface PedidoDoCliente {
  id: string;
  numero: number;
  data_pedido: string;
  status: StatusPedido;
  total: number;
  pago_valor: number;
  prazo_entrega: string | null;
}

export interface OrcamentoDoCliente {
  id: string;
  numero: number;
  titulo: string;
  status: string;
  total: number;
}

export interface ComprasDoCliente {
  /** null = sem o módulo Pedidos (ou sem leitura nele). */
  pedidos: PedidoDoCliente[] | null;
  /** null = sem o módulo Orçamentos (ou sem leitura nele). */
  orcamentos: OrcamentoDoCliente[] | null;
  /** Soma do total dos pedidos não cancelados. */
  totalComprado: number;
  /** Data do pedido não cancelado mais recente. */
  ultimaCompra: string | null;
  /** Texto do erro de leitura (como veio do banco); com erro a tela não mostra "nenhum pedido". */
  erro: string | null;
}

/** Total comprado e última compra: só pedidos não cancelados. */
export function resumirCompras(pedidos: readonly Pick<PedidoDoCliente, "status" | "total" | "data_pedido">[]) {
  const validos = pedidos.filter((p) => p.status !== "cancelado");
  return {
    totalComprado: validos.reduce((s, p) => s + Number(p.total || 0), 0),
    ultimaCompra: validos.reduce<string | null>((m, p) => (m === null || p.data_pedido > m ? p.data_pedido : m), null),
  };
}
