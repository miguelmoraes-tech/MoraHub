export type ClienteStatus = "ativo" | "em_andamento" | "pausado" | "encerrado";

export interface Cliente {
  id: string;
  user_id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  resumo: string | null;
  site_link: string | null;
  status: ClienteStatus;
  segmento: string | null;
  abordado_por: string | null;
  lead_origem_id: string | null;
  created_at: string;
}

export interface Contrato {
  id: string;
  user_id: string;
  cliente_id: string;
  descricao: string;
  valor: number;
  data: string | null;
  vencimento: string | null;
  link: string | null;
  arquivo_path: string | null;
  created_at: string;
}

export interface Comprovante {
  id: string;
  user_id: string;
  cliente_id: string;
  descricao: string;
  valor: number;
  data: string | null;
  link: string | null;
  arquivo_path: string | null;
  created_at: string;
}

export type AssinaturaRecorrencia = "Mensal" | "Anual" | "Único";
export type AssinaturaStatus = "ativa" | "pausada" | "cancelada";

export interface Assinatura {
  id: string;
  user_id: string;
  cliente_id: string;
  plano: string;
  valor: number | null;
  recorrencia: AssinaturaRecorrencia;
  data_inicio: string | null;
  proxima_cobranca: string | null;
  status: AssinaturaStatus;
  created_at: string;
}

export interface Servico {
  id: string;
  user_id: string;
  cliente_id: string;
  nome: string;
  created_at: string;
}

export type LeadStatus = "abordar" | "abordado" | "convertido";
export type LeadResultado = "sem_resposta" | "negou";
export type LeadTipoContato = "whatsapp" | "ligacao" | "ambos";

export interface Lead {
  id: string;
  user_id: string;
  nome: string;
  contato: string | null;
  tem_site: boolean;
  site_link: string | null;
  tem_insta: boolean;
  insta_link: string | null;
  descricao: string | null;
  status: LeadStatus;
  resultado: LeadResultado | null;
  motivo_negou: string | null;
  abordado_por: string | null;
  nicho: string | null;
  previa_enviada: boolean;
  data_previa: string | null;
  tipo_contato: LeadTipoContato;
  created_at: string;
}

export interface Renegado {
  id: string;
  user_id: string;
  nome: string;
  contato: string | null;
  tem_site: boolean;
  site_link: string | null;
  tem_insta: boolean;
  insta_link: string | null;
  descricao: string | null;
  abordado_por: string;
  motivo_negou: string | null;
  data_abordagem: string | null;
  nicho: string | null;
  created_at: string;
}

export type PropostaStatus = "enviada" | "em_negociacao" | "aceita" | "recusada";

export interface Proposta {
  id: string;
  user_id: string;
  lead_id: string | null;
  cliente_id: string | null;
  titulo: string;
  descricao: string | null;
  valor: number | null;
  versao: number;
  status: PropostaStatus;
  data_envio: string | null;
  data_resposta: string | null;
  observacoes: string | null;
  created_at: string;
}

