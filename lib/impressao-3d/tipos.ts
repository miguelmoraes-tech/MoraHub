/**
 * Tipos e rótulos do nicho Impressão 3D (tabelas p3d_*). Rows tipadas à mão,
 * como o resto do app (ver lib/types.ts): o client do Supabase não usa o
 * generic `Database`. Sem dependência de servidor nem de React.
 */

export type Tecnologia = "fdm" | "resina" | "sls" | "outra";
export const TECNOLOGIA_ROTULO: Record<Tecnologia, string> = {
  fdm: "FDM (filamento)",
  resina: "Resina",
  sls: "SLS",
  outra: "Outra",
};

export type StatusImpressora = "disponivel" | "imprimindo" | "manutencao" | "inativa";
export const STATUS_IMPRESSORA_ROTULO: Record<StatusImpressora, string> = {
  disponivel: "Disponível",
  imprimindo: "Imprimindo",
  manutencao: "Em manutenção",
  inativa: "Inativa",
};

export type IntegracaoTipo = "octoprint" | "moonraker" | "bambu" | "prusalink" | "outra";
export const INTEGRACAO_ROTULO: Record<IntegracaoTipo, string> = {
  octoprint: "OctoPrint",
  moonraker: "Moonraker / Klipper",
  bambu: "Bambu Lab",
  prusalink: "PrusaLink",
  outra: "Outra",
};

export type CategoriaDesgaste = "bico" | "correia" | "mesa" | "lubrificacao" | "ventoinha" | "outro";
export const CATEGORIA_DESGASTE_ROTULO: Record<CategoriaDesgaste, string> = {
  bico: "Bico",
  correia: "Correia",
  mesa: "Mesa",
  lubrificacao: "Lubrificação",
  ventoinha: "Ventoinha",
  outro: "Outro",
};

export type TipoManutencao = "preventiva" | "corretiva";
export const TIPO_MANUTENCAO_ROTULO: Record<TipoManutencao, string> = {
  preventiva: "Preventiva",
  corretiva: "Corretiva",
};

export type TipoMaterial = "filamento" | "resina" | "peca" | "embalagem" | "insumo";
export const TIPO_MATERIAL_ROTULO: Record<TipoMaterial, string> = {
  filamento: "Filamento",
  resina: "Resina",
  peca: "Peça",
  embalagem: "Embalagem",
  insumo: "Insumo",
};

export type UnidadeMaterial = "g" | "ml" | "un";
export const UNIDADE_ROTULO: Record<UnidadeMaterial, string> = {
  g: "g (gramas)",
  ml: "ml (mililitros)",
  un: "un (unidades)",
};

export type TipoMovimento = "entrada" | "ajuste" | "saida_producao" | "falha" | "perda" | "devolucao";
export const TIPO_MOVIMENTO_ROTULO: Record<TipoMovimento, string> = {
  entrada: "Entrada",
  ajuste: "Ajuste",
  saida_producao: "Saída para produção",
  falha: "Falha de impressão",
  perda: "Perda",
  devolucao: "Devolução",
};

export type TipoArquivo = "stl" | "3mf" | "gcode" | "foto" | "outro";
export const TIPO_ARQUIVO_ROTULO: Record<TipoArquivo, string> = {
  stl: "STL",
  "3mf": "3MF",
  gcode: "GCODE",
  foto: "Foto",
  outro: "Outro",
};

export type StatusOrcamento = "rascunho" | "enviado" | "aprovado" | "recusado" | "expirado" | "convertido";
export const STATUS_ORCAMENTO_ROTULO: Record<StatusOrcamento, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  recusado: "Recusado",
  expirado: "Expirado",
  convertido: "Convertido",
};

export interface Impressora {
  id: string;
  workspace_id: string;
  nome: string;
  marca: string | null;
  modelo: string | null;
  tecnologia: Tecnologia;
  volume_x_mm: number | null;
  volume_y_mm: number | null;
  volume_z_mm: number | null;
  bico_mm: number | null;
  status: StatusImpressora;
  potencia_media_kw: number;
  valor_aquisicao: number;
  valor_residual: number;
  vida_util_horas: number;
  data_aquisicao: string | null;
  horas_uso: number;
  manutencao_hora: number;
  manutencao_ciclo: number;
  intervalo_manutencao_horas: number | null;
  horas_ultima_manutencao: number;
  integracao_tipo: IntegracaoTipo | null;
  integracao_url: string | null;
  observacoes: string | null;
  ativo: boolean;
}

export interface PecaDesgaste {
  id: string;
  impressora_id: string;
  nome: string;
  categoria: CategoriaDesgaste;
  custo: number;
  vida_util_horas: number;
  horas_ultima_troca: number;
}

export interface Manutencao {
  id: string;
  impressora_id: string;
  tipo: TipoManutencao;
  descricao: string;
  custo: number;
  data: string;
  horas_uso_no_momento: number | null;
}

export interface Material {
  id: string;
  workspace_id: string;
  tipo: TipoMaterial;
  nome: string;
  marca: string | null;
  material: string | null;
  cor: string | null;
  cor_hex: string | null;
  diametro_mm: number | null;
  unidade: UnidadeMaterial;
  peso_liquido_rolo_g: number | null;
  preco_compra: number | null;
  custo_cadastro: number | null;
  custo_medio: number;
  ultimo_custo: number;
  estoque_atual: number;
  estoque_minimo: number;
  localizacao: string | null;
  ativo: boolean;
}

export interface MovimentoEstoque {
  id: string;
  material_id: string;
  tipo: TipoMovimento;
  delta: number;
  saldo_apos: number;
  custo_unitario: number | null;
  custo_total: number | null;
  observacao: string | null;
  created_at: string;
}

export interface Produto {
  id: string;
  workspace_id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  sku: string | null;
  impressora_id: string | null;
  material_id: string | null;
  peso_estimado_g: number | null;
  horas_estimadas: number | null;
  preco_venda: number | null;
  publicado_loja: boolean;
  ativo: boolean;
}

export interface Variacao {
  id: string;
  produto_id: string;
  nome: string;
  sku: string | null;
  cor: string | null;
  tamanho: string | null;
  material_id: string | null;
  peso_g: number | null;
  horas_estimadas: number | null;
  preco_venda: number | null;
  ativo: boolean;
}

export interface ArquivoProduto {
  id: string;
  produto_id: string;
  variacao_id: string | null;
  tipo: TipoArquivo;
  nome: string;
  storage_path: string;
  tamanho_bytes: number | null;
  mime_type: string | null;
  created_at: string;
}

export interface ConfigPrecificacao {
  tarifa_kwh: number;
  valor_hora_mao_obra: number;
  desperdicio_pct: number;
  falha_pct: number;
  falha_fracao_perdida: number;
  modo_preco: "margem" | "markup";
  margem_pct: number;
  markup_pct: number;
  impostos_pct: number;
  taxa_pagamento_pct: number;
  comissao_pct: number;
  taxa_fixa_pagamento: number;
  despesas_fixas_pct: number;
  arredondar_para: number;
  preco_minimo: number;
  base_custo_material: "cadastro" | "medio";
}

export interface Orcamento {
  id: string;
  numero: number;
  cliente_id: string | null;
  titulo: string;
  status: StatusOrcamento;
  validade: string | null;
  desconto_valor: number;
  subtotal: number;
  total: number;
  custo_total: number;
  lucro_total: number;
  observacoes: string | null;
  enviado_em: string | null;
  aprovado_em: string | null;
  created_at: string;
}

export interface ItemOrcamento {
  id: string;
  orcamento_id: string;
  ordem: number;
  descricao: string;
  produto_id: string | null;
  variacao_id: string | null;
  quantidade: number;
  entrada: Record<string, unknown>;
  calculo: unknown;
  custo_total: number;
  preco_total: number;
  preco_unitario: number;
  lucro: number;
  versao_formula: number;
  calculado_em: string;
}

/** Colunas de cada select (nunca `*`: quem não tem o extra "custos" não recebe custo). */
export const COLUNAS_IMPRESSORA =
  "id, workspace_id, nome, marca, modelo, tecnologia, volume_x_mm, volume_y_mm, volume_z_mm, bico_mm, status, potencia_media_kw, valor_aquisicao, valor_residual, vida_util_horas, data_aquisicao, horas_uso, manutencao_hora, manutencao_ciclo, intervalo_manutencao_horas, horas_ultima_manutencao, integracao_tipo, integracao_url, observacoes, ativo";
