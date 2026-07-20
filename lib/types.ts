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

export type AcessoCategoria =
  | "Hospedagem"
  | "Domínio"
  | "Google"
  | "Meta"
  | "Cloudflare"
  | "GitHub"
  | "WordPress"
  | "VPS"
  | "Shopify"
  | "Outro";

export interface Acesso {
  id: string;
  user_id: string;
  cliente_id: string;
  nome_servico: string;
  categoria: AcessoCategoria | null;
  url_login: string | null;
  usuario: string | null;
  email: string | null;
  observacoes: string | null;
  referencia_senha: string | null;
  created_at: string;
}

export interface Infraestrutura {
  id: string;
  user_id: string;
  cliente_id: string;
  dominio: string;
  hospedagem: string | null;
  servidor: string | null;
  dns: string | null;
  ssl: string | null;
  cdn: string | null;
  contas_email: string | null;
  tecnologias: string | null;
  data_renovacao: string | null;
  observacoes: string | null;
  created_at: string;
}

export type ProjetoStatus =
  | "planejado"
  | "em_andamento"
  | "concluido"
  | "pausado";

export interface Projeto {
  id: string;
  user_id: string;
  cliente_id: string;
  nome: string;
  tipo: string | null;
  status: ProjetoStatus;
  escopo: string | null;
  tecnologias: string | null;
  links: string | null;
  repositorio_git: string | null;
  deploy_url: string | null;
  documentacao_link: string | null;
  observacoes: string | null;
  created_at: string;
}

export interface Manutencao {
  id: string;
  user_id: string;
  cliente_id: string;
  projeto_id: string | null;
  data: string;
  responsavel: string | null;
  tempo_gasto: string | null;
  descricao: string;
  observacoes: string | null;
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
  nicho: string | null;
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

