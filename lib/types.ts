export type ClienteStatus = "pendente" | "finalizado";

export interface Cliente {
  id: string;
  user_id: string;
  nome: string;
  contato: string | null;
  resumo: string | null;
  site_link: string | null;
  status: ClienteStatus;
  assinatura_ativa: boolean;
  assinatura_plano: string | null;
  assinatura_vencimento: string | null;
  abordado_por: string | null;
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
  created_at: string;
}

export interface Servico {
  id: string;
  user_id: string;
  cliente_id: string;
  nome: string;
  created_at: string;
}

export type LeadStatus = "abordar" | "abordado";
export type LeadResultado = "sem_resposta" | "negou";

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
  created_at: string;
}

export type Recorrencia = "Mensal" | "Anual" | "Único";

export interface GastoFixo {
  id: string;
  user_id: string;
  nome: string;
  valor: number;
  recorrencia: Recorrencia;
  data: string | null;
  created_at: string;
}

export interface GastoCliente {
  id: string;
  user_id: string;
  cliente_id: string;
  descricao: string;
  valor: number;
  data: string | null;
  created_at: string;
}

export type DocumentoTipo = "link" | "nota";

export interface Documento {
  id: string;
  user_id: string;
  titulo: string;
  tipo: DocumentoTipo;
  conteudo: string | null;
  data: string | null;
  created_at: string;
}

export interface Vencimento {
  id: string;
  user_id: string;
  titulo: string;
  data: string;
  nota: string | null;
  created_at: string;
}

export type JuridicoTipo = "Fiscal" | "Jurídico" | "Contábil";
export type JuridicoStatus = "pendente" | "concluida";

export interface Juridico {
  id: string;
  user_id: string;
  titulo: string;
  tipo: JuridicoTipo;
  prazo: string | null;
  status: JuridicoStatus;
  nota: string | null;
  created_at: string;
}

