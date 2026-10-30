import type { ReuniaoCanal, ReuniaoStatus } from "@/lib/types";
import type { ChipTone } from "@/components/status-chip";

/**
 * Pure helpers/constants shared between the vendedor server pages and the
 * client components (agenda, lead detail). Kept free of next/headers and
 * lib/supabase/server so any client component can import it — see
 * lib/colaborador-shared.ts for why this split exists.
 */

/** How often an open lead detail pings lead_view_ping (the RPC credits at most 20s per ping). */
export const LEAD_VIEW_PING_INTERVAL_MS = 15_000;

export const REUNIAO_CANAIS: ReuniaoCanal[] = [
  "video",
  "presencial",
  "telefone",
  "whatsapp",
];

export const REUNIAO_CANAL_LABEL: Record<ReuniaoCanal, string> = {
  presencial: "Presencial",
  video: "Vídeo",
  telefone: "Telefone",
  whatsapp: "WhatsApp",
};

export const REUNIAO_STATUS_LABEL: Record<ReuniaoStatus, string> = {
  agendada: "Agendada",
  realizada: "Realizada",
  cancelada: "Cancelada",
  nao_compareceu: "Não compareceu",
};

export const REUNIAO_STATUS_TONE: Record<ReuniaoStatus, ChipTone> = {
  agendada: "sky",
  realizada: "emerald",
  cancelada: "zinc",
  nao_compareceu: "rose",
};

/** Messages raised by the lead/reunião RPCs that are already meant for the user. */
const RPC_USER_MESSAGES = [
  "lead já atribuído a outro vendedor",
  "lead já convertido em cliente",
  "sem permissão",
  "lead não encontrado",
  "reunião não encontrada",
  "data/hora obrigatória",
  "não autenticado",
];

/** Turns a Postgres/PostgREST error message from the RPCs into toast-ready text. */
export function rpcErrorMessage(message: string | undefined | null): string {
  const known = RPC_USER_MESSAGES.find((m) => message?.includes(m));
  if (!known) return "Não foi possível concluir a ação. Tente novamente.";
  return known.charAt(0).toUpperCase() + known.slice(1) + ".";
}

/** Seconds as mm:ss (minutes are not wrapped at 60, e.g. 4500s -> "75:00"). */
export function formatDuracao(totalSeg: number): string {
  const seg = Math.max(0, Math.round(totalSeg));
  const mm = Math.floor(seg / 60);
  const ss = seg % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

// --- Código do gestor (entrada do vendedor por código) ---

export type SolicitacaoVendedorStatus = "pendente" | "aprovado" | "recusado";

/** Row of `solicitacoes_vendedor` (read-only through RLS). */
export interface SolicitacaoVendedor {
  id: string;
  workspace_id: string;
  user_id: string;
  email: string | null;
  status: SolicitacaoVendedorStatus;
  created_at: string;
  respondido_em: string | null;
  /** null = pedido de vendedor; senão, o setor (perfis_acesso) cujo código foi usado. */
  perfil_acesso_id?: string | null;
  /** 'cofundador' = pedido feito com um código de cofundador (coluna só de leitura). */
  papel_solicitado?: string | null;
}

/** How often the "aguardando aprovação" screen asks whether the gestor answered. */
export const SOLICITACAO_POLL_INTERVAL_MS = 10_000;

export const CODIGO_VENDEDOR_LENGTH = 10;

/**
 * Shapes whatever is typed/pasted into the XXXXX-XXXXX form: letters and
 * digits only, upper case, hyphen after the 5th character. The RPC accepts
 * any casing and with/without hyphen, so this is purely for the eyes.
 */
export function formatarCodigoVendedor(raw: string): string {
  const limpo = raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, CODIGO_VENDEDOR_LENGTH);
  return limpo.length > 5 ? `${limpo.slice(0, 5)}-${limpo.slice(5)}` : limpo;
}

/**
 * Código de acesso digitado na tela "Entrar numa empresa": vale o de vendedor
 * (10 caracteres) e o de setor. Só limpa e põe em maiúsculas; o banco confere.
 */
export const CODIGO_ACESSO_MIN = 6;
export const CODIGO_ACESSO_MAX = 32;

export function limparCodigoAcesso(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, CODIGO_ACESSO_MAX);
}

/** Mesmo visual de XXXXX-XXXXX: hífen depois do 5º caractere. */
export function formatarCodigoAcesso(raw: string): string {
  const limpo = limparCodigoAcesso(raw);
  return limpo.length > 5 ? `${limpo.slice(0, 5)}-${limpo.slice(5)}` : limpo;
}

export function solicitarAcessoErrorMessage(message: string | undefined | null): string {
  // As RPCs levantam texto claro em português (código usado, expirado, cancelado, "este é o seu próprio
  // código", "já é cofundador", "já tem pedido pendente"...): mostrado COMO VEIO.
  return erroDaRpc(message, "Não foi possível enviar o código. Tente novamente.");
}

export function gestorErrorMessage(message: string | undefined | null): string {
  return erroDaRpc(message, "Não foi possível concluir a ação. Tente novamente.");
}

/** Texto do erro da RPC como veio; só vazio cai no texto padrão. */
export function erroDaRpc(message: string | undefined | null, padrao: string): string {
  const texto = (message ?? "").trim();
  return texto || padrao;
}
