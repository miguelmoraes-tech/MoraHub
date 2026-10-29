/**
 * Tipos e rótulos da Etapa B do nicho Impressão 3D (fornecedores e compras,
 * pedidos, produção, qualidade e expedição). Rows tipadas à mão, como em
 * tipos.ts; sem dependência de servidor nem de React.
 */

// --- Fornecedores e compras --------------------------------------------------

export type StatusCompra = "cotacao" | "aprovada" | "recebida" | "cancelada";
export const STATUS_COMPRA_ROTULO: Record<StatusCompra, string> = {
  cotacao: "Cotação",
  aprovada: "Aprovada",
  recebida: "Recebida",
  cancelada: "Cancelada",
};

export interface Fornecedor {
  id: string;
  nome: string;
  contato: string | null;
  telefone: string | null;
  email: string | null;
  site: string | null;
  categoria: string | null;
  observacoes: string | null;
  ativo: boolean;
}

export interface Compra {
  id: string;
  numero: number;
  fornecedor_id: string;
  status: StatusCompra;
  data: string;
  validade_cotacao: string | null;
  prazo_entrega: string | null;
  frete: number;
  desconto: number;
  subtotal: number;
  total: number;
  observacoes: string | null;
  recebida_em: string | null;
  conta_pagar_id: string | null;
  created_at: string;
}

export interface CompraItem {
  id: string;
  compra_id: string;
  material_id: string;
  quantidade: number;
  preco_total: number;
  preco_unitario: number | null;
  observacao: string | null;
}

/** Linha da view p3d_historico_precos (preço unitário sem frete). */
export interface HistoricoPreco {
  material_id: string | null;
  fornecedor_id: string | null;
  compra_id: string | null;
  compra_numero: number | null;
  compra_status: StatusCompra | null;
  data: string | null;
  quantidade: number | null;
  preco_unitario: number | null;
  preco_total: number | null;
}

/** Retorno de p3d_receber_compra. */
export interface ResultadoRecebimento {
  itens_recebidos: number;
  total: number;
  conta_pagar_id: string | null;
}

// --- Pedidos -------------------------------------------------------------------

export type StatusPedido = "novo" | "confirmado" | "em_producao" | "pronto" | "enviado" | "entregue" | "cancelado";
export const STATUS_PEDIDO_ROTULO: Record<StatusPedido, string> = {
  novo: "Novo",
  confirmado: "Confirmado",
  em_producao: "Em produção",
  pronto: "Pronto",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export type StatusPagamento = "pendente" | "parcial" | "pago";
export const STATUS_PAGAMENTO_ROTULO: Record<StatusPagamento, string> = {
  pendente: "Pendente",
  parcial: "Parcial",
  pago: "Pago",
};

export type Prioridade = "baixa" | "normal" | "alta" | "urgente";
export const PRIORIDADE_ROTULO: Record<Prioridade, string> = {
  baixa: "Baixa",
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
};

export type FormaPagamento = "pix" | "cartao" | "boleto" | "dinheiro" | "transferencia" | "outro";
export const FORMA_PAGAMENTO_ROTULO: Record<FormaPagamento, string> = {
  pix: "Pix",
  cartao: "Cartão",
  boleto: "Boleto",
  dinheiro: "Dinheiro",
  transferencia: "Transferência",
  outro: "Outro",
};

export interface Pedido {
  id: string;
  numero: number;
  cliente_id: string | null;
  cliente_avulso: string | null;
  status: StatusPedido;
  status_pagamento: StatusPagamento;
  prioridade: Prioridade;
  origem: string;
  orcamento_id: string | null;
  data_pedido: string;
  prazo_entrega: string | null;
  desconto_valor: number;
  frete_valor: number;
  subtotal: number;
  total: number;
  pago_valor: number;
  custo_total: number;
  lucro_total: number;
  observacoes: string | null;
  cancelado_em: string | null;
  cancelado_motivo: string | null;
  created_at: string;
}

export interface PedidoItem {
  id: string;
  pedido_id: string;
  ordem: number;
  origem: string;
  descricao: string;
  produto_id: string | null;
  variacao_id: string | null;
  quantidade: number;
  preco_unitario: number;
  preco_total: number;
  custo_unitario: number;
  custo_total: number;
  lucro: number;
  entrada: unknown;
  calculo: unknown;
}

export interface PedidoPagamento {
  id: string;
  pedido_id: string;
  tipo: "pagamento" | "estorno";
  forma: FormaPagamento;
  valor: number;
  data: string;
  observacao: string | null;
  conta_receber_id: string | null;
  created_at: string;
}

export interface PedidoHistorico {
  id: string;
  pedido_id: string;
  de: string | null;
  para: string;
  motivo: string | null;
  created_at: string;
}

/** Retorno de p3d_registrar_pagamento. */
export interface ResultadoPagamento {
  pagamento_id: string;
  pago_valor: number;
  saldo: number;
  status_pagamento: StatusPagamento;
  conta_receber_id: string | null;
}

// --- Produção ------------------------------------------------------------------

export type StatusProducao = "fila" | "imprimindo" | "concluida" | "falhou" | "cancelada";
export const STATUS_PRODUCAO_ROTULO: Record<StatusProducao, string> = {
  fila: "Na fila",
  imprimindo: "Imprimindo",
  concluida: "Concluída",
  falhou: "Falhou",
  cancelada: "Cancelada",
};

export type QualidadeProducao = "pendente" | "aprovada" | "reprovada";
export const QUALIDADE_ROTULO: Record<QualidadeProducao, string> = {
  pendente: "Pendente",
  aprovada: "Aprovada",
  reprovada: "Reprovada",
};

export interface Trabalho {
  id: string;
  numero: number;
  descricao: string;
  quantidade: number;
  status: StatusProducao;
  qualidade: QualidadeProducao;
  prioridade: Prioridade;
  prazo: string | null;
  pedido_id: string | null;
  pedido_item_id: string | null;
  produto_id: string | null;
  variacao_id: string | null;
  arquivo_id: string | null;
  impressora_id: string | null;
  material_id: string | null;
  horas_estimadas: number | null;
  peso_estimado_g: number | null;
  horas_reais: number | null;
  peso_real_g: number | null;
  iniciado_em: string | null;
  concluido_em: string | null;
  consumo_registrado_em: string | null;
  reimpressao_de: string | null;
  observacoes: string | null;
  created_at: string;
}

/** Retorno de p3d_iniciar_producao. */
export interface ResultadoInicio {
  impressora: string | null;
  aviso: string | null;
}

/** Retorno de p3d_concluir_producao. */
export interface ResultadoConclusao {
  saldo: number | null;
  estoque_negativo: boolean;
  abaixo_do_minimo: boolean;
  manutencao_devida: boolean;
}

/** Retorno de p3d_registrar_falha. */
export interface ResultadoFalha {
  falha_id: string;
  reimpressao_id: string | null;
  baixou_estoque: boolean;
  custo_material: number;
  custo_maquina_estimado: number;
  estoque_negativo: boolean;
}

// --- Qualidade -----------------------------------------------------------------

export const TIPOS_DEFEITO = [
  "stringing", "warping", "descolou_da_mesa", "deslocamento_de_camada", "subextrusao", "superextrusao",
  "falha_suporte", "entupimento", "queda_energia", "erro_arquivo", "acabamento", "dimensional", "cor", "outro",
] as const;
export type TipoDefeito = (typeof TIPOS_DEFEITO)[number];
export const TIPO_DEFEITO_ROTULO: Record<TipoDefeito, string> = {
  stringing: "Stringing (fiapos)",
  warping: "Warping (empenamento)",
  descolou_da_mesa: "Descolou da mesa",
  deslocamento_de_camada: "Deslocamento de camada",
  subextrusao: "Subextrusão",
  superextrusao: "Superextrusão",
  falha_suporte: "Falha de suporte",
  entupimento: "Entupimento",
  queda_energia: "Queda de energia",
  erro_arquivo: "Erro de arquivo",
  acabamento: "Acabamento",
  dimensional: "Dimensional",
  cor: "Cor",
  outro: "Outro",
};

export type ResultadoInspecao = "aprovado" | "reprovado" | "retrabalho";
export const RESULTADO_INSPECAO_ROTULO: Record<ResultadoInspecao, string> = {
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  retrabalho: "Retrabalho",
};

export interface Inspecao {
  id: string;
  producao_id: string;
  resultado: ResultadoInspecao;
  defeitos: string[];
  observacoes: string | null;
  created_at: string;
}

export interface Falha {
  id: string;
  producao_id: string;
  tipo_defeito: string;
  descricao: string | null;
  peso_perdido_g: number;
  horas_perdidas: number;
  /** Só chega com o extra "custos" de Qualidade (o servidor não seleciona sem ele). */
  custo_material?: number;
  custo_maquina_estimado?: number;
  baixou_estoque: boolean;
  impressora_id: string | null;
  material_id: string | null;
  produto_id: string | null;
  reimpressao_producao_id: string | null;
  created_at: string;
}

// --- Expedição -----------------------------------------------------------------

export type StatusEnvio = "preparando" | "postado" | "em_transito" | "entregue" | "devolvido" | "problema";
export const STATUS_ENVIO_ROTULO: Record<StatusEnvio, string> = {
  preparando: "Preparando",
  postado: "Postado",
  em_transito: "Em trânsito",
  entregue: "Entregue",
  devolvido: "Devolvido",
  problema: "Problema",
};

export interface Envio {
  id: string;
  pedido_id: string;
  status: StatusEnvio;
  transportadora: string | null;
  servico: string | null;
  codigo_rastreio: string | null;
  url_rastreio: string | null;
  custo_frete: number;
  peso_kg: number | null;
  volumes: number;
  previsao_entrega: string | null;
  postado_em: string | null;
  entregue_em: string | null;
  recebedor: string | null;
  observacoes: string | null;
  created_at: string;
}

// --- Colunas dos selects (nunca `*`) --------------------------------------------

export const COLUNAS_FORNECEDOR = "id, nome, contato, telefone, email, site, categoria, observacoes, ativo";
export const COLUNAS_COMPRA =
  "id, numero, fornecedor_id, status, data, validade_cotacao, prazo_entrega, frete, desconto, subtotal, total, observacoes, recebida_em, conta_pagar_id, created_at";
export const COLUNAS_COMPRA_ITEM = "id, compra_id, material_id, quantidade, preco_total, preco_unitario, observacao";
export const COLUNAS_HISTORICO_PRECOS =
  "material_id, fornecedor_id, compra_id, compra_numero, compra_status, data, quantidade, preco_unitario, preco_total";
export const COLUNAS_PEDIDO =
  "id, numero, cliente_id, cliente_avulso, status, status_pagamento, prioridade, origem, orcamento_id, data_pedido, prazo_entrega, desconto_valor, frete_valor, subtotal, total, pago_valor, observacoes, cancelado_em, cancelado_motivo, created_at";
export const COLUNAS_PEDIDO_ITEM =
  "id, pedido_id, ordem, origem, descricao, produto_id, variacao_id, quantidade, preco_unitario, preco_total, entrada, calculo";
export const COLUNAS_PEDIDO_PAGAMENTO = "id, pedido_id, tipo, forma, valor, data, observacao, conta_receber_id, created_at";
export const COLUNAS_PEDIDO_HISTORICO = "id, pedido_id, de, para, motivo, created_at";
export const COLUNAS_TRABALHO =
  "id, numero, descricao, quantidade, status, qualidade, prioridade, prazo, pedido_id, pedido_item_id, produto_id, variacao_id, arquivo_id, impressora_id, material_id, horas_estimadas, peso_estimado_g, horas_reais, peso_real_g, iniciado_em, concluido_em, consumo_registrado_em, reimpressao_de, observacoes, created_at";
export const COLUNAS_INSPECAO = "id, producao_id, resultado, defeitos, observacoes, created_at";
/** Falhas SEM custo: é o que sai do servidor para quem não tem o extra "custos" de Qualidade. */
export const COLUNAS_FALHA =
  "id, producao_id, tipo_defeito, descricao, peso_perdido_g, horas_perdidas, baixou_estoque, impressora_id, material_id, produto_id, reimpressao_producao_id, created_at";
export const COLUNAS_FALHA_CUSTOS = `${COLUNAS_FALHA}, custo_material, custo_maquina_estimado`;
export const COLUNAS_ENVIO =
  "id, pedido_id, status, transportadora, servico, codigo_rastreio, url_rastreio, custo_frete, peso_kg, volumes, previsao_entrega, postado_em, entregue_em, recebedor, observacoes, created_at";
