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

export interface Backup {
  id: string;
  user_id: string;
  cliente_id: string;
  projeto_id: string | null;
  data: string;
  tipo: string | null;
  local: string | null;
  link_ou_arquivo: string | null;
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
  ultimo_contato: string | null;
  proximo_followup: string | null;
  intervalo_followup_dias: number | null;
  campanha_id: string | null;
}

export type FollowupCanal = "whatsapp" | "ligacao" | "email" | "presencial" | "outro";

export interface FollowupLead {
  id: string;
  user_id: string;
  lead_id: string;
  data_contato: string;
  canal: FollowupCanal | null;
  resumo: string | null;
  proximo_followup: string | null;
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
  projeto_id: string | null;
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

export type ColaboradorPapel =
  | "contador"
  | "advogado"
  | "financeiro"
  | "rh"
  | "comercial"
  | "marketing";
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

export type LancamentoExtratoTipo = "credito" | "debito";
export type StatusConciliacao = "pendente" | "conciliado" | "ignorado";

export interface LancamentoExtrato {
  id: string;
  user_id: string;
  data: string;
  descricao: string;
  valor: number;
  tipo: LancamentoExtratoTipo;
  status_conciliacao: StatusConciliacao;
  gasto_id: string | null;
  comprovante_id: string | null;
  arquivo_origem: string | null;
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

export interface Departamento {
  id: string;
  user_id: string;
  nome: string;
  descricao: string | null;
  gestor_funcionario_id: string | null;
  created_at: string;
}

export type FuncionarioTipoContrato =
  | "clt"
  | "pj"
  | "estagio"
  | "freelancer"
  | "outro";
export type FuncionarioStatus = "ativo" | "afastado" | "desligado";

export interface Funcionario {
  id: string;
  user_id: string;
  membro_id: string | null;
  nome: string;
  cargo: string | null;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
  data_admissao: string | null;
  data_desligamento: string | null;
  tipo_contrato: FuncionarioTipoContrato;
  salario: number | null;
  status: FuncionarioStatus;
  observacoes: string | null;
  departamento_id: string | null;
  gestor_id: string | null;
  created_at: string;
  updated_at: string;
}

export type FeriasStatus = "pendente" | "agendada" | "em_gozo" | "concluida";

export interface Feria {
  id: string;
  user_id: string;
  funcionario_id: string;
  periodo_aquisitivo_inicio: string | null;
  periodo_aquisitivo_fim: string | null;
  dias_direito: number;
  dias_gozados: number;
  data_inicio_gozo: string | null;
  data_fim_gozo: string | null;
  status: FeriasStatus;
  observacoes: string | null;
  created_at: string;
}

export type BeneficioTipo =
  | "vale_refeicao"
  | "vale_transporte"
  | "plano_saude"
  | "plano_odontologico"
  | "seguro_vida"
  | "outro";

export interface Beneficio {
  id: string;
  user_id: string;
  funcionario_id: string;
  tipo: BeneficioTipo;
  valor: number | null;
  observacoes: string | null;
  created_at: string;
}

export type FolhaPagamentoStatus = "pendente" | "pago";

export interface FolhaPagamento {
  id: string;
  user_id: string;
  funcionario_id: string;
  mes_referencia: string;
  salario_bruto: number | null;
  descontos: number;
  salario_liquido: number | null;
  status: FolhaPagamentoStatus;
  data_pagamento: string | null;
  conta_pagar_id: string | null;
  observacoes: string | null;
  created_at: string;
}

export type VagaStatus = "aberta" | "pausada" | "fechada";

export interface Vaga {
  id: string;
  user_id: string;
  titulo: string;
  departamento_id: string | null;
  status: VagaStatus;
  descricao: string | null;
  requisitos: string | null;
  salario_previsto: number | null;
  tipo_contrato: FuncionarioTipoContrato;
  created_at: string;
}

export type CandidatoStatus =
  | "triagem"
  | "entrevista"
  | "teste"
  | "aprovado"
  | "reprovado"
  | "contratado";

export interface Candidato {
  id: string;
  user_id: string;
  vaga_id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  status: CandidatoStatus;
  curriculo_path: string | null;
  origem: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AvaliacaoDesempenho {
  id: string;
  user_id: string;
  funcionario_id: string;
  avaliador_id: string | null;
  periodo_referencia: string;
  nota: number | null;
  pontos_fortes: string | null;
  pontos_melhoria: string | null;
  metas_proximo_periodo: string | null;
  observacoes: string | null;
  created_at: string;
}

export type ControlePontoStatus =
  | "normal"
  | "falta"
  | "falta_justificada"
  | "feriado"
  | "ferias"
  | "atestado";

export interface ControlePonto {
  id: string;
  user_id: string;
  funcionario_id: string;
  data: string;
  entrada: string | null;
  saida_almoco: string | null;
  volta_almoco: string | null;
  saida: string | null;
  horas_trabalhadas: number | null;
  status: ControlePontoStatus;
  observacoes: string | null;
  created_at: string;
}

export type TicketCategoria =
  | "tecnico"
  | "financeiro"
  | "juridico"
  | "contabil"
  | "geral"
  | "outro";
export type TicketPrioridade = "baixa" | "media" | "alta" | "urgente";
export type TicketStatus =
  | "aberto"
  | "em_andamento"
  | "aguardando_cliente"
  | "resolvido"
  | "fechado";

export interface Ticket {
  id: string;
  user_id: string;
  cliente_id: string | null;
  titulo: string;
  descricao: string | null;
  categoria: TicketCategoria;
  prioridade: TicketPrioridade;
  status: TicketStatus;
  sla_horas: number | null;
  responsavel_id: string | null;
  data_abertura: string;
  data_primeira_resposta: string | null;
  data_resolucao: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketResposta {
  id: string;
  ticket_id: string;
  autor_id: string;
  conteudo: string;
  interna: boolean;
  created_at: string;
}

export type MetaOkrTipo = "objetivo" | "resultado_chave";
export type MetaOkrSetor =
  | "geral"
  | "financeiro"
  | "comercial"
  | "marketing"
  | "rh"
  | "juridico"
  | "contabil"
  | "tecnico";
export type MetaOkrUnidade = "numero" | "reais" | "percentual" | "clientes" | "outro";
export type MetaOkrStatus =
  | "nao_iniciado"
  | "em_andamento"
  | "concluido"
  | "atrasado"
  | "cancelado";

export interface MetaOkr {
  id: string;
  user_id: string;
  parent_okr_id: string | null;
  tipo: MetaOkrTipo;
  titulo: string;
  descricao: string | null;
  setor: MetaOkrSetor;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  valor_meta: number | null;
  valor_atual: number;
  unidade: MetaOkrUnidade;
  status: MetaOkrStatus;
  responsavel_id: string | null;
  created_at: string;
  updated_at: string;
}

/** Shape returned by get_colaboradores_do_dono_by_id() — same as
 * ColaboradorVinculado but callable for a dono other than auth.uid(), as
 * long as the caller is that dono or an active membro of theirs. */
export interface ColaboradorParaAtribuicao {
  id: string;
  membro_id: string;
  papel: ColaboradorPapel;
  status: MembroStatus;
  created_at: string;
  nome: string | null;
  email: string | null;
}

export type CalendarioConteudoTipo =
  | "post"
  | "video"
  | "artigo"
  | "email"
  | "stories"
  | "outro";

export type CalendarioConteudoCanal =
  | "instagram"
  | "facebook"
  | "linkedin"
  | "tiktok"
  | "youtube"
  | "blog"
  | "email"
  | "outro";

export type CalendarioConteudoStatus =
  | "planejado"
  | "em_producao"
  | "agendado"
  | "publicado"
  | "cancelado";

export interface CalendarioConteudo {
  id: string;
  user_id: string;
  titulo: string;
  tipo: CalendarioConteudoTipo;
  canal: CalendarioConteudoCanal;
  data_publicacao: string | null;
  status: CalendarioConteudoStatus;
  conteudo: string | null;
  link_publicado: string | null;
  responsavel_id: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export type CampanhaCanal =
  | "meta_ads"
  | "google_ads"
  | "linkedin_ads"
  | "tiktok_ads"
  | "organico"
  | "outro";

export type CampanhaStatus = "planejada" | "ativa" | "pausada" | "encerrada";

export interface Campanha {
  id: string;
  user_id: string;
  nome: string;
  canal: CampanhaCanal;
  status: CampanhaStatus;
  data_inicio: string | null;
  data_fim: string | null;
  orcamento_planejado: number | null;
  valor_gasto: number;
  cliques: number;
  impressoes: number;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

