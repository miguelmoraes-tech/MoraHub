import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Aprovações entre fundadores (tabela `aprovacoes`, RPCs listar_aprovacoes /
 * aprovar_alteracao / cancelar_alteracao / fundadores_da_empresa). Só lógica
 * pura e textos: sem React, sem servidor, para testar de ponta a ponta.
 *
 * Regra de produto: fundador e cofundadores são administradores do mesmo nível.
 * Com 2 ou mais, as funções administrativas NÃO executam na hora: criam um
 * pedido e retornam. Com 1 fundador, executam como sempre.
 */

export type StatusAprovacao =
  | "pendente"
  | "aprovada"
  | "recusada"
  | "expirada"
  | "cancelada"
  | "falhou";

const STATUS_CONHECIDOS: readonly StatusAprovacao[] = [
  "pendente",
  "aprovada",
  "recusada",
  "expirada",
  "cancelada",
  "falhou",
];

export interface Fundador {
  user_id: string;
  nome: string | null;
  email: string | null;
  papel: string;
}

/** Uma linha de listar_aprovacoes. `votos` e `faltam` são jsonb: use nomesDeVotos/nomesDeFaltantes. */
export interface Aprovacao {
  id: string;
  tipo: string;
  resumo: string;
  status: StatusAprovacao;
  proposto_por: string;
  proposto_por_nome: string | null;
  created_at: string;
  expira_em: string | null;
  decidido_em: string | null;
  erro: string | null;
  resultado: unknown;
  votos: unknown;
  faltam: unknown;
  eu_posso_votar: boolean;
}

/** O que `aprovar_alteracao` devolve. */
export type ResultadoVoto = "pendente" | "aprovada" | "recusada" | "expirada" | "falhou";

export const DIAS_HISTORICO = 30;

/** Link da tela e frase única do aviso (toast e inline). */
export const ROTA_APROVACOES = "/aprovacoes";
export const AVISO_ENVIADO = "Enviado para aprovação dos outros fundadores";

/** Com 2 ou mais fundadores a ação fica pendente. */
export function precisaAprovacao(qtdFundadores: number): boolean {
  return qtdFundadores >= 2;
}

/** Fundadores (dono + cofundadores) da empresa; null se a consulta falhar. */
export async function listarFundadores(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<Fundador[] | null> {
  try {
    const { data, error } = await supabase.rpc("fundadores_da_empresa", {
      p_workspace_id: workspaceId,
    });
    if (error || !Array.isArray(data)) return null;
    return (data as Fundador[]).filter((f) => typeof f?.user_id === "string");
  } catch {
    return null;
  }
}

/**
 * A ação que vou chamar ficará pendente? Com 2+ fundadores, sim. Se não der
 * para saber (consulta falhou), assume que SIM: o pior caso é avisar "enviado
 * para aprovação" e reler o servidor, nunca atualizar a tela como se tivesse
 * executado algo que talvez ainda esteja pendente.
 */
export async function exigeAprovacao(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<boolean> {
  const fundadores = await listarFundadores(supabase, workspaceId);
  return fundadores === null ? true : precisaAprovacao(fundadores.length);
}

/** Converte a linha crua do banco; descarta o que não tem id ou status conhecido. */
export function lerAprovacoes(bruto: unknown): Aprovacao[] {
  if (!Array.isArray(bruto)) return [];
  const saida: Aprovacao[] = [];
  for (const item of bruto) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const status = r.status as StatusAprovacao;
    if (typeof r.id !== "string" || !STATUS_CONHECIDOS.includes(status)) continue;
    saida.push({
      id: r.id,
      tipo: typeof r.tipo === "string" ? r.tipo : "",
      resumo: typeof r.resumo === "string" ? r.resumo : "",
      status,
      proposto_por: typeof r.proposto_por === "string" ? r.proposto_por : "",
      proposto_por_nome: typeof r.proposto_por_nome === "string" ? r.proposto_por_nome : null,
      created_at: typeof r.created_at === "string" ? r.created_at : "",
      expira_em: typeof r.expira_em === "string" ? r.expira_em : null,
      decidido_em: typeof r.decidido_em === "string" ? r.decidido_em : null,
      erro: typeof r.erro === "string" ? r.erro : null,
      resultado: r.resultado ?? null,
      votos: r.votos ?? null,
      faltam: r.faltam ?? null,
      eu_posso_votar: r.eu_posso_votar === true,
    });
  }
  return saida;
}

/** Intervalo mínimo entre duas leituras disparadas pelo foco da aba. */
export const INTERVALO_FOCO_MS = 5000;

/**
 * Voltar o foco à aba só relê a lista se a aba está visível e a última leitura
 * (de qualquer origem) é antiga: foco + visibilidade juntos não viram duas
 * leituras, e uma leitura recém-feita não dispara outra (sem laço).
 */
export function deveReler(
  agoraMs: number,
  ultimaLeituraMs: number,
  visivel: boolean,
  intervaloMs = INTERVALO_FOCO_MS
): boolean {
  return visivel && agoraMs - ultimaLeituraMs >= intervaloMs;
}

/** Venceu o prazo (o banco pode ainda não ter marcado como expirada). */
export function venceu(a: Pick<Aprovacao, "expira_em">, agora: Date): boolean {
  return !!a.expira_em && new Date(a.expira_em).getTime() <= agora.getTime();
}

/** Pendente de verdade: status pendente e dentro do prazo. */
export function estaPendente(a: Aprovacao, agora: Date): boolean {
  return a.status === "pendente" && !venceu(a, agora);
}

/** Pedidos pendentes (dentro do prazo), mais antigos primeiro. */
export function pendentes(lista: readonly Aprovacao[], agora: Date): Aprovacao[] {
  return lista
    .filter((a) => estaPendente(a, agora))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/** Quantas pendências EU posso votar: é o número do badge. */
export function contarMinhasPendencias(lista: readonly Aprovacao[], agora: Date): number {
  return lista.filter((a) => estaPendente(a, agora) && a.eu_posso_votar).length;
}

/**
 * Histórico dos últimos 30 dias: tudo que não está pendente, e também o que
 * ficou pendente além do prazo (vira "expirada" na tela). Mais recente primeiro.
 */
export function historico(lista: readonly Aprovacao[], agora: Date, dias = DIAS_HISTORICO): Aprovacao[] {
  const corte = agora.getTime() - dias * 24 * 60 * 60 * 1000;
  return lista
    .filter((a) => !estaPendente(a, agora))
    .filter((a) => {
      const quando = new Date(a.decidido_em ?? a.expira_em ?? a.created_at).getTime();
      return Number.isFinite(quando) && quando >= corte;
    })
    .sort((a, b) => (b.decidido_em ?? b.created_at).localeCompare(a.decidido_em ?? a.created_at));
}

/** Status mostrado: pendente com prazo vencido aparece como expirada. */
export function statusExibido(a: Aprovacao, agora: Date): StatusAprovacao {
  return a.status === "pendente" && venceu(a, agora) ? "expirada" : a.status;
}

export const STATUS_ROTULO: Record<StatusAprovacao, string> = {
  pendente: "Pendente",
  aprovada: "Aprovada",
  recusada: "Recusada",
  expirada: "Expirada",
  cancelada: "Cancelada",
  falhou: "Falhou",
};

/** Quem pode cancelar: só quem propôs, enquanto pendente. */
export function podeCancelar(a: Aprovacao, meuId: string, agora: Date): boolean {
  return estaPendente(a, agora) && a.proposto_por === meuId;
}

/** Quem pode votar: o banco diz (eu_posso_votar), e o pedido precisa estar vivo. */
export function podeVotar(a: Aprovacao, agora: Date): boolean {
  return estaPendente(a, agora) && a.eu_posso_votar;
}

// --- votos / faltam (jsonb de formato aberto: lê com tolerância) -------------

export interface VotoLido {
  nome: string;
  /** true = aprovou, false = recusou, null = o banco não informou. */
  aprovou: boolean | null;
}

function nomeDe(item: unknown): string | null {
  if (typeof item === "string") return item.trim() || null;
  if (!item || typeof item !== "object") return null;
  const r = item as Record<string, unknown>;
  for (const campo of ["nome", "name", "email", "user_id"]) {
    const v = r[campo];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function listaDe(bruto: unknown): unknown[] {
  if (Array.isArray(bruto)) return bruto;
  if (bruto && typeof bruto === "object") {
    // Mapa { user_id: valor }: o valor pode ser o voto ou o nome.
    return Object.entries(bruto as Record<string, unknown>).map(([chave, valor]) =>
      valor && typeof valor === "object" ? { user_id: chave, ...(valor as object) } : { user_id: chave, valor }
    );
  }
  return [];
}

function votoDe(item: unknown): boolean | null {
  if (!item || typeof item !== "object") return null;
  const r = item as Record<string, unknown>;
  for (const campo of ["aprovou", "aprovar", "aprovado", "voto"]) {
    const v = r[campo];
    if (typeof v === "boolean") return v;
    if (typeof v === "string") {
      const t = v.toLowerCase();
      if (["aprovou", "aprovar", "aprovado", "sim", "true"].includes(t)) return true;
      if (["recusou", "recusar", "recusado", "nao", "não", "false"].includes(t)) return false;
    }
  }
  return null;
}

export function lerVotos(bruto: unknown): VotoLido[] {
  const saida: VotoLido[] = [];
  for (const item of listaDe(bruto)) {
    const nome = nomeDe(item);
    if (nome) saida.push({ nome, aprovou: votoDe(item) });
  }
  return saida;
}

export function nomesDeFaltantes(bruto: unknown): string[] {
  return listaDe(bruto)
    .map(nomeDe)
    .filter((n): n is string => !!n);
}

// --- resultado do pedido aprovado ---------------------------------------------

export type ResultadoLegivel =
  | { tipo: "convite"; token: string; caminho: string }
  | { tipo: "codigo"; codigo: string }
  | null;

function textoCurto(v: unknown): string | null {
  return typeof v === "string" && v.trim() && v.length <= 200 ? v.trim() : null;
}

/**
 * Do jsonb `resultado` de um pedido aprovado: convite (token → /convite/<token>)
 * ou código novo de setor/vendedor. Decide pelo conteúdo, não pelo `tipo`.
 * Só chamar para pedidos aprovados; a tela só mostra isso a fundadores.
 */
export function lerResultado(resultado: unknown, status: StatusAprovacao): ResultadoLegivel {
  if (status !== "aprovada") return null;
  if (typeof resultado === "string") {
    const t = textoCurto(resultado);
    return t ? { tipo: "codigo", codigo: t } : null;
  }
  if (!resultado || typeof resultado !== "object") return null;
  const r = resultado as Record<string, unknown>;
  const token = textoCurto(r.token);
  if (token) return { tipo: "convite", token, caminho: `/convite/${encodeURIComponent(token)}` };
  const codigo = textoCurto(r.codigo) ?? textoCurto(r.code);
  return codigo ? { tipo: "codigo", codigo } : null;
}

// --- textos ----------------------------------------------------------------------

const TIPOS: [trecho: string, rotulo: string][] = [
  ["convid", "Convite"],
  ["cancelar_convite", "Convite"],
  ["permiss", "Permissões"],
  ["remover", "Equipe"],
  ["perfil", "Setor"],
  ["setor", "Setor"],
  ["codigo", "Código de acesso"],
  ["solicitacao", "Pedido de acesso"],
  ["modulo", "Módulos"],
  ["nicho", "Nicho"],
  ["rotulo", "Nomes das telas"],
  ["renomear", "Empresa"],
];

export function rotuloDoTipo(tipo: string): string {
  const t = tipo.toLowerCase();
  return TIPOS.find(([trecho]) => t.includes(trecho))?.[1] ?? "Alteração";
}

/** Mensagem do voto, a partir do status que aprovar_alteracao devolve. */
export function mensagemDoVoto(status: string, aprovou: boolean): { tom: "ok" | "info" | "erro"; texto: string } {
  switch (status) {
    case "pendente":
      return {
        tom: "info",
        texto: aprovou
          ? "Seu voto foi registrado. Aguardando os outros fundadores."
          : "Seu voto foi registrado.",
      };
    case "aprovada":
      return { tom: "ok", texto: "Aprovado por todos os fundadores. A alteração foi aplicada." };
    case "recusada":
      return { tom: "ok", texto: "Pedido recusado." };
    case "expirada":
      return { tom: "erro", texto: "Este pedido expirou e não pode mais ser votado." };
    case "falhou":
      return {
        tom: "erro",
        texto: "Todos aprovaram, mas a alteração não pôde ser aplicada. Veja o motivo no histórico.",
      };
    default:
      return { tom: "erro", texto: "Não foi possível registrar o voto. Tente novamente." };
  }
}

const ERROS_APROVACAO: [trecho: string, texto: string][] = [
  ["not_authenticated", "Sessão expirada. Faça login novamente."],
  ["expir", "Este pedido expirou e não pode mais ser votado."],
  ["cancel", "Este pedido foi cancelado."],
  ["já votou", "Você já votou neste pedido."],
  ["ja votou", "Você já votou neste pedido."],
  ["já foi", "Este pedido já foi decidido."],
  ["decidid", "Este pedido já foi decidido."],
  ["não encontr", "Pedido não encontrado."],
  ["nao encontr", "Pedido não encontrado."],
  ["not found", "Pedido não encontrado."],
  ["fundador", "Só os fundadores da empresa podem decidir isto."],
  ["permiss", "Sem permissão para esta ação."],
];

/** Erro de aprovar_alteracao / cancelar_alteracao / listar_aprovacoes, por trecho. */
export function erroDeAprovacao(message: string | undefined | null): string {
  const m = (message ?? "").toLowerCase();
  return (
    ERROS_APROVACAO.find(([trecho]) => m.includes(trecho))?.[1] ??
    "Não foi possível concluir. Tente novamente."
  );
}

const ERROS_DE_FALHA: [trecho: string, texto: string][] = [
  ["nicho inválido", "O tipo de negócio escolhido não está mais disponível."],
  ["modelo inválido", "O modelo escolhido não está mais disponível."],
  ["use de 1 a 40", "Os nomes das telas precisam ter de 1 a 40 caracteres."],
  ["depend", "O módulo depende de outro que está desligado."],
  ["já faz parte", "Esta pessoa já faz parte da empresa."],
  ["já tem", "Esta pessoa já tem acesso ou um convite pendente."],
  ["already", "Esta pessoa já faz parte da empresa ou já tem um convite pendente."],
  ["limite", "Foi atingido um limite permitido para esta ação."],
  ["não encontr", "O item da alteração não existe mais."],
  ["nao encontr", "O item da alteração não existe mais."],
  ["já respondida", "Este pedido de acesso já tinha sido respondido."],
  ["inválid", "Os dados da alteração deixaram de ser válidos."],
  ["permiss", "Quem propôs não tinha mais permissão para esta alteração."],
];

/** `erro` de um pedido que falhou, em texto legível (por trecho). */
export function erroDaFalha(erro: string | null | undefined): string {
  const m = (erro ?? "").toLowerCase();
  if (!m) return "A alteração não pôde ser aplicada.";
  return (
    ERROS_DE_FALHA.find(([trecho]) => m.includes(trecho))?.[1] ??
    "A alteração não pôde ser aplicada."
  );
}

/** "Enviado para aprovação...", ou o texto de sucesso de sempre. */
export function textoDoResultado(pendente: boolean, textoImediato: string): string {
  return pendente ? AVISO_ENVIADO : textoImediato;
}

/** Frase da regra, para Configurações/Equipe (só quando há 2 ou mais fundadores). */
export function fraseDaRegra(qtdFundadores: number): string | null {
  if (!precisaAprovacao(qtdFundadores)) return null;
  return "Fundador e cofundadores têm o mesmo nível. Qualquer alteração na empresa só acontece depois da aprovação de todos os fundadores. O pedido fica em Aprovações até todos votarem.";
}

/** Data e hora curtas em pt-BR (fuso local). */
export function quando(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(d);
}
