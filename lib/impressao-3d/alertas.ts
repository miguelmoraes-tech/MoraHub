/**
 * Notificações e alertas do nicho Impressão 3D (Etapa C-1): tipos, agrupamento por severidade,
 * destino do link de cada notificação e limite de frequência da atualização. Sem banco e sem React.
 *
 * As notificações são geradas e resolvidas pelo BANCO (p3d_atualizar_alertas); `p3d_notificacoes`
 * é somente leitura para o app (só p3d_marcar_notificacao altera lida_em). Esta etapa não envia
 * e-mail, WhatsApp nem push: o envio externo depende das integrações (ver docs).
 */

export type Severidade = "info" | "aviso" | "critico";
export const SEVERIDADES: readonly Severidade[] = ["critico", "aviso", "info"];
export const SEVERIDADE_ROTULO: Record<Severidade, string> = {
  critico: "Crítico",
  aviso: "Aviso",
  info: "Informação",
};

/** Severidade desconhecida nunca derruba a tela: vira informação. */
export function severidadeValida(v: unknown): Severidade {
  return v === "critico" || v === "aviso" || v === "info" ? v : "info";
}

export type ReferenciaTipo = "material" | "pedido" | "impressora" | "orcamento" | "compra" | "falha";

export interface Notificacao {
  id: string;
  tipo: string;
  severidade: Severidade;
  titulo: string;
  mensagem: string | null;
  referencia_tipo: string | null;
  referencia_id: string | null;
  lida_em: string | null;
  resolvida_em: string | null;
  created_at: string;
}

/** Colunas lidas (nunca `*`). */
export const COLUNAS_NOTIFICACAO =
  "id, tipo, severidade, titulo, mensagem, referencia_tipo, referencia_id, lida_em, resolvida_em, created_at";

/** Linhas do banco (severidade como texto) → Notificacao. Linha sem id/título é descartada. */
export function lerNotificacoes(bruto: unknown): Notificacao[] {
  if (!Array.isArray(bruto)) return [];
  const saida: Notificacao[] = [];
  for (const item of bruto) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.titulo !== "string" || typeof r.created_at !== "string") continue;
    const s = (v: unknown) => (typeof v === "string" && v !== "" ? v : null);
    saida.push({
      id: r.id,
      tipo: typeof r.tipo === "string" ? r.tipo : "",
      severidade: severidadeValida(r.severidade),
      titulo: r.titulo,
      mensagem: s(r.mensagem),
      referencia_tipo: s(r.referencia_tipo),
      referencia_id: s(r.referencia_id),
      lida_em: s(r.lida_em),
      resolvida_em: s(r.resolvida_em),
      created_at: r.created_at,
    });
  }
  return saida;
}

export const estaAberta = (n: Pick<Notificacao, "resolvida_em">) => n.resolvida_em === null;

/** Mais novas primeiro (created_at decrescente); empate mantém a ordem recebida. */
export function maisNovasPrimeiro<T extends Pick<Notificacao, "created_at">>(itens: readonly T[]): T[] {
  return [...itens].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export interface GrupoSeveridade {
  severidade: Severidade;
  itens: Notificacao[];
}

/** Críticas, avisos e informações, nessa ordem; grupo vazio some. */
export function agruparPorSeveridade(itens: readonly Notificacao[]): GrupoSeveridade[] {
  return SEVERIDADES.map((severidade) => ({
    severidade,
    itens: maisNovasPrimeiro(itens.filter((n) => n.severidade === severidade)),
  })).filter((g) => g.itens.length > 0);
}

/** "estoque_baixo" → "Estoque baixo" (o banco decide os tipos; o app não mantém lista fechada). */
export function rotuloDoTipo(tipo: string): string {
  const t = tipo.replace(/_/g, " ").trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "Outros";
}

// --- Link para o item de referência ------------------------------------------------------------

interface AlvoReferencia {
  modulo: string;
  lista: string;
  /** Rota de detalhe (recebe o id) quando existe. */
  detalhe?: (id: string) => string;
}

const ALVOS: Record<ReferenciaTipo, AlvoReferencia> = {
  material: { modulo: "p3d_estoque", lista: "/impressao-3d/estoque" },
  pedido: { modulo: "p3d_pedidos", lista: "/impressao-3d/pedidos", detalhe: (id) => `/impressao-3d/pedidos/${id}` },
  impressora: { modulo: "p3d_impressoras", lista: "/impressao-3d/impressoras" },
  orcamento: {
    modulo: "p3d_orcamentos",
    lista: "/impressao-3d/orcamentos",
    detalhe: (id) => `/impressao-3d/orcamentos/${id}`,
  },
  compra: {
    modulo: "p3d_fornecedores",
    lista: "/impressao-3d/fornecedores",
    detalhe: (id) => `/impressao-3d/fornecedores/compras/${id}`,
  },
  falha: { modulo: "p3d_qualidade", lista: "/impressao-3d/qualidade" },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Módulo dono do item de referência (para saber se a pessoa tem acesso). */
export function moduloDaReferencia(tipo: string | null): string | null {
  return tipo && tipo in ALVOS ? ALVOS[tipo as ReferenciaTipo].modulo : null;
}

/**
 * Link da notificação: só se a pessoa tem acesso ao módulo do item (`acessiveis` = módulos que ela
 * pode abrir). Sem acesso, ou referência desconhecida, devolve null e a tela mostra só o título.
 * O id só entra na rota se for um UUID (nada da notificação vira caminho sem validação).
 */
export function destinoDaReferencia(
  tipo: string | null,
  id: string | null,
  acessiveis: readonly string[]
): string | null {
  if (!tipo || !(tipo in ALVOS)) return null;
  const alvo = ALVOS[tipo as ReferenciaTipo];
  if (!acessiveis.includes(alvo.modulo)) return null;
  return alvo.detalhe && id && UUID.test(id) ? alvo.detalhe(id) : alvo.lista;
}

// --- Limite de frequência da atualização (cliente) ---------------------------------------------

export const INTERVALO_ATUALIZACAO_MS = 60_000;

/** True se já passou o intervalo desde a última atualização (ou se nunca houve uma). */
export function deveAtualizar(
  ultima: number | null,
  agora: number,
  intervaloMs: number = INTERVALO_ATUALIZACAO_MS
): boolean {
  return ultima === null || agora - ultima >= intervaloMs || agora < ultima;
}

// --- Configuração dos alertas (p3d_config_alertas) ---------------------------------------------

export interface ConfigAlertas {
  estoque_baixo: boolean;
  prazo_pedido_dias: number;
  manutencao: boolean;
  pagamento_pendente_dias: number;
  orcamento_validade: boolean;
  compra_pendente_dias: number;
  falhas_recorrentes_limite: number;
  falhas_recorrentes_dias: number;
}

export const COLUNAS_CONFIG_ALERTAS =
  "estoque_baixo, prazo_pedido_dias, manutencao, pagamento_pendente_dias, orcamento_validade, compra_pendente_dias, falhas_recorrentes_limite, falhas_recorrentes_dias";

export const FAIXAS_CONFIG_ALERTAS = {
  prazo_pedido_dias: { min: 0, max: 30 },
  pagamento_pendente_dias: { min: 0, max: 90 },
  compra_pendente_dias: { min: 0, max: 60 },
  falhas_recorrentes_limite: { min: 1, max: 50 },
  falhas_recorrentes_dias: { min: 1, max: 90 },
} as const;

/** Lê a linha de p3d_config_alertas; faltando algum campo, devolve null (a tela não inventa padrão). */
export function lerConfigAlertas(bruto: unknown): ConfigAlertas | null {
  if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) return null;
  const r = bruto as Record<string, unknown>;
  const bool = (k: string) => (typeof r[k] === "boolean" ? (r[k] as boolean) : null);
  const inteiro = (k: string) => (typeof r[k] === "number" && Number.isInteger(r[k]) ? (r[k] as number) : null);
  const c = {
    estoque_baixo: bool("estoque_baixo"),
    prazo_pedido_dias: inteiro("prazo_pedido_dias"),
    manutencao: bool("manutencao"),
    pagamento_pendente_dias: inteiro("pagamento_pendente_dias"),
    orcamento_validade: bool("orcamento_validade"),
    compra_pendente_dias: inteiro("compra_pendente_dias"),
    falhas_recorrentes_limite: inteiro("falhas_recorrentes_limite"),
    falhas_recorrentes_dias: inteiro("falhas_recorrentes_dias"),
  };
  return Object.values(c).every((v) => v !== null) ? (c as ConfigAlertas) : null;
}
