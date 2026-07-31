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
  responsavel: string | null;
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

export type Recorrencia = "Mensal" | "Anual" | "Único";
export type GastoTipo = "fixo" | "pontual";

export interface Gasto {
  id: string;
  user_id: string;
  nome: string;
  valor: number;
  tipo: GastoTipo;
  recorrencia: Recorrencia | null;
  cliente_id: string | null;
  categoria: string | null;
  data: string;
  created_at: string;
}

export type DocumentoTipo = "link" | "nota";
export type DocumentoCategoria =
  | "Contrato"
  | "Proposta"
  | "Briefing"
  | "Nota fiscal"
  | "Arquivo do cliente"
  | "Outro";

export type StatusAssinatura = "pendente" | "assinado" | "recusado";

export interface Signatario {
  nome: string;
  email: string;
  assinado: boolean;
}

export interface Documento {
  id: string;
  user_id: string;
  cliente_id: string | null;
  titulo: string;
  tipo: DocumentoTipo;
  categoria: DocumentoCategoria | null;
  conteudo: string | null;
  arquivo_path: string | null;
  data: string | null;
  created_at: string;
  precisa_assinatura: boolean;
  status_assinatura: StatusAssinatura | null;
  signatarios: Signatario[];
  id_externo_assinatura: string | null;
  link_assinatura: string | null;
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

export type ColaboradorPapel = "contador" | "advogado" | "financeiro";
export type ConviteStatus = "pendente" | "aceito" | "recusado" | "expirado";
export type MembroStatus = "ativo" | "removido";

export interface Convite {
  id: string;
  dono_id: string;
  email_convidado: string;
  papel: ColaboradorPapel;
  status: ConviteStatus;
  token: string;
  created_at: string;
  respondido_em: string | null;
}

export interface Membro {
  id: string;
  dono_id: string;
  membro_id: string;
  papel: ColaboradorPapel;
  status: MembroStatus;
  created_at: string;
}

/** Shape returned by the get_colaboradores_do_dono() RPC (membros + display name/email). */
export interface ColaboradorVinculado {
  id: string;
  membro_id: string;
  papel: ColaboradorPapel;
  status: MembroStatus;
  created_at: string;
  nome: string | null;
  email: string | null;
}

/** Shape returned by the get_contas_vinculadas() RPC (owner accounts a collaborator can enter). */
export interface ContaVinculada {
  dono_id: string;
  papel: ColaboradorPapel;
  dono_nome: string | null;
  dono_email: string | null;
}

export type ProcessoFase =
  | "inicial"
  | "instrucao"
  | "recursal"
  | "execucao"
  | "encerrado";

export interface Processo {
  id: string;
  user_id: string;
  cliente_id: string;
  numero_processo: string | null;
  tribunal_orgao: string | null;
  parte_contraria: string | null;
  tipo_acao: string | null;
  fase: ProcessoFase;
  proximo_prazo: string | null;
  descricao_prazo: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export type FechamentoStatus = "pendente" | "em_andamento" | "concluido";

export interface FechamentoChecklistItem {
  item: string;
  feito: boolean;
}

export interface FechamentoMensal {
  id: string;
  user_id: string;
  cliente_id: string;
  mes_referencia: string;
  status: FechamentoStatus;
  checklist: FechamentoChecklistItem[];
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export type SolicitacaoDocumentoStatus = "pendente" | "enviado" | "concluida";

export interface SolicitacaoDocumento {
  id: string;
  user_id: string;
  cliente_id: string;
  solicitante_id: string;
  titulo: string;
  descricao: string | null;
  status: SolicitacaoDocumentoStatus;
  documento_id: string | null;
  created_at: string;
}

export type ContaPagarStatus = "pendente" | "pago" | "atrasado";

export interface ContaPagar {
  id: string;
  user_id: string;
  descricao: string;
  valor: number;
  fornecedor: string | null;
  categoria: string | null;
  data_vencimento: string;
  data_pagamento: string | null;
  status: ContaPagarStatus;
  observacoes: string | null;
  created_at: string;
}

export type ContaReceberStatus = "pendente" | "recebido" | "atrasado";

export interface ContaReceber {
  id: string;
  user_id: string;
  cliente_id: string | null;
  proposta_id: string | null;
  descricao: string;
  valor: number;
  data_vencimento: string;
  data_recebimento: string | null;
  status: ContaReceberStatus;
  observacoes: string | null;
  created_at: string;
}

export interface Orcamento {
  id: string;
  user_id: string;
  categoria: string;
  mes_referencia: string;
  valor_planejado: number;
  observacoes: string | null;
  created_at: string;
}

export type PropriedadeIntelectualTipo =
  | "Marca"
  | "Patente"
  | "Direito Autoral"
  | "Domínio"
  | "Outro";

export type PropriedadeIntelectualStatus =
  | "registrado"
  | "em_analise"
  | "pendente"
  | "vencido";

export interface PropriedadeIntelectual {
  id: string;
  user_id: string;
  cliente_id: string | null;
  tipo: PropriedadeIntelectualTipo;
  nome: string;
  numero_registro: string | null;
  orgao: string | null;
  status: PropriedadeIntelectualStatus;
  data_registro: string | null;
  data_renovacao: string | null;
  observacoes: string | null;
  created_at: string;
}

export interface PessoalPropriedadeIntelectual {
  id: string;
  user_id: string;
  tipo: PropriedadeIntelectualTipo;
  nome: string;
  numero_registro: string | null;
  orgao: string | null;
  status: PropriedadeIntelectualStatus;
  data_registro: string | null;
  data_renovacao: string | null;
  observacoes: string | null;
  created_at: string;
}

/** Same {item, feito} shape as FechamentoChecklistItem — kept as a separate
 * alias so each feature's checklist can evolve independently if needed. */
export interface ChecklistItem {
  item: string;
  feito: boolean;
}

export type ComplianceCategoria = "LGPD" | "Alvará" | "Licença" | "Outro";
export type PessoalComplianceCategoria = "LGPD" | "Outro";
export type ComplianceStatus = "pendente" | "em_andamento" | "conforme";

export interface ComplianceJuridico {
  id: string;
  user_id: string;
  cliente_id: string | null;
  categoria: ComplianceCategoria;
  checklist: ChecklistItem[];
  status: ComplianceStatus;
  proxima_revisao: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PessoalCompliance {
  id: string;
  user_id: string;
  categoria: PessoalComplianceCategoria;
  checklist: ChecklistItem[];
  status: ComplianceStatus;
  proxima_revisao: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModeloContrato {
  id: string;
  user_id: string;
  titulo: string;
  categoria: string | null;
  conteudo: string | null;
  arquivo_path: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Conversa {
  id: string;
  dono_id: string;
  membro_id: string;
  papel: ColaboradorPapel;
  created_at: string;
}

export interface Mensagem {
  id: string;
  conversa_id: string;
  remetente_id: string;
  conteudo: string;
  lida: boolean;
  created_at: string;
}

/** Shape returned by the get_conversa_participante_info() RPC — the *other*
 * party's display info from whichever side of the conversa is calling. */
export interface ConversaParticipanteInfo {
  nome: string | null;
  email: string | null;
  status: MembroStatus;
}

