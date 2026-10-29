/**
 * Frase de uma linha por módulo do nicho Impressão 3D, mostrada na página Módulos: para que serve e
 * que os dados ficam guardados ao remover. Só texto de tela; o catálogo (`modulos`) segue no banco.
 */
const GUARDADOS = "Os dados ficam guardados ao remover.";

export const FRASE_MODULO: Record<string, string> = {
  p3d_impressoras: `Cadastre suas impressoras e veja o custo por hora. ${GUARDADOS}`,
  p3d_estoque: `Controle filamentos e insumos, com custo por g e alerta de mínimo. ${GUARDADOS}`,
  p3d_precificacao: `Calcule o custo por peça e o preço sugerido. ${GUARDADOS}`,
  p3d_produtos: `Catálogo de peças com variações e arquivos. ${GUARDADOS}`,
  p3d_orcamentos: `Monte orçamentos com os itens calculados para enviar ao cliente. ${GUARDADOS}`,
  p3d_fornecedores: `Fornecedores e compras de material, com entrada no estoque. ${GUARDADOS}`,
  p3d_pedidos: `Pedidos e vendas, com pagamentos e histórico. ${GUARDADOS}`,
  p3d_producao: `Fila de impressão por impressora, com horas reais e status. ${GUARDADOS}`,
  p3d_qualidade: `Inspeções e registro das falhas, com o custo do que se perdeu. ${GUARDADOS}`,
  p3d_expedicao: `Envios, rastreio e entrega dos pedidos. ${GUARDADOS}`,
  p3d_dashboard: `Painel com vendas, produção, estoque e resultado. ${GUARDADOS}`,
  p3d_relatorios: `Relatórios do nicho para consultar e exportar. ${GUARDADOS}`,
  p3d_automacoes: `Alertas de estoque, prazos, manutenção e pagamentos. ${GUARDADOS}`,
  p3d_integracoes: `Cadastro das integrações (WhatsApp, pagamento, envio). ${GUARDADOS}`,
};
