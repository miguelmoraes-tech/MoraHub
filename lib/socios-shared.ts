import {
  normalizarPermissoes,
  modulosVisiveis,
  type NivelPermissao,
  type PermissaoModulo,
} from "@/lib/modulos/permissoes";

/**
 * Tipos e helpers da tela /socios (equipe, convites e setores). Sem
 * dependência de servidor, para os componentes client e as actions usarem.
 */

/** Papéis que se convida pela tela. 'cofundador' só o fundador (a RPC também confere). */
export type PapelConvidavel = "socio" | "funcionario" | "cofundador";

export const PAPEL_CONVIDAVEL_ROTULO: Record<PapelConvidavel, string> = {
  socio: "Sócio",
  funcionario: "Funcionário",
  cofundador: "Cofundador",
};

/** Rótulo de qualquer papel que aparece na lista da equipe (inclui os legados). */
export const PAPEL_EQUIPE_ROTULO: Record<string, string> = {
  dono: "Fundador",
  cofundador: "Cofundador",
  socio: "Sócio",
  funcionario: "Funcionário",
  comercial: "Vendedor",
};

export function rotuloDoPapel(papel: string): string {
  return PAPEL_EQUIPE_ROTULO[papel] ?? papel;
}

/** Rótulos de reserva dos módulos com permissão (o nome do catálogo tem preferência). */
export const MODULO_ROTULO: Record<string, string> = {
  leads: "Leads",
  renegados: "Renegados",
  clientes: "Clientes",
  agenda: "Agenda",
  marketing: "Marketing",
  financeiro: "Financeiro",
  juridico: "Jurídico",
  rh: "RH",
  p3d_impressoras: "Impressoras",
  p3d_estoque: "Estoque (Impressão 3D)",
  p3d_produtos: "Produtos e catálogo",
  p3d_precificacao: "Calculadora de preço",
  p3d_orcamentos: "Orçamentos 3D",
  p3d_fornecedores: "Fornecedores e compras",
  p3d_pedidos: "Pedidos e vendas",
  p3d_producao: "Produção",
  p3d_qualidade: "Qualidade",
  p3d_expedicao: "Expedição",
  p3d_dashboard: "Dashboard 3D",
  p3d_relatorios: "Relatórios 3D",
  p3d_automacoes: "Notificações e automações",
  p3d_integracoes: "Integrações (Impressão 3D)",
};

export const NIVEL_ROTULO: Record<NivelPermissao, string> = {
  leitura: "Leitura",
  edicao: "Edição",
};

/** Um extra de tela de um módulo (modulos.permissoes_extras). */
export interface ExtraCatalogo {
  chave: string;
  rotulo: string;
}

/** Módulo que aceita permissão, com os extras que o catálogo oferece. */
export interface ModuloPermissivel {
  chave: string;
  nome: string;
  extras: ExtraCatalogo[];
}

/**
 * `modulos.permissoes_extras` é jsonb no formato
 * [{"nome":"Ver contato dos leads","chave":"contato"}]: `chave` identifica e
 * `nome` é o rótulo. Segue tolerando o formato antigo ["contato"] (e rotulo/
 * label no lugar de nome). Qualquer outra forma é ignorada — extra
 * desconhecido nunca aparece como opção.
 */
export function extrasDoCatalogo(bruto: unknown): ExtraCatalogo[] {
  if (!Array.isArray(bruto)) return [];
  const saida: ExtraCatalogo[] = [];
  for (const item of bruto) {
    if (typeof item === "string" && item) {
      saida.push({ chave: item, rotulo: item.charAt(0).toUpperCase() + item.slice(1) });
    } else if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      const chave = [o.chave, o.key, o.id].find((v): v is string => typeof v === "string" && !!v);
      const rotulo = [o.nome, o.rotulo, o.label].find(
        (v): v is string => typeof v === "string" && !!v
      );
      if (chave) {
        saida.push({
          chave,
          rotulo: rotulo ?? chave.charAt(0).toUpperCase() + chave.slice(1),
        });
      }
    }
  }
  return saida;
}

export interface MembroEquipe {
  membroId: string;
  email: string | null;
  nome: string | null;
  papel: string;
  createdAt: string;
  permissoes: PermissaoModulo[];
}

export interface ConviteEquipe {
  id: string;
  email: string;
  papel: string;
  createdAt: string;
  expiraEm: string | null;
  permissoes: PermissaoModulo[];
}

export interface SetorAcesso {
  id: string;
  nome: string;
  descricao: string | null;
  codigo: string;
  ativo: boolean;
  permissoes: PermissaoModulo[];
}

export function paraMembros(data: unknown): MembroEquipe[] {
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    membroId: String(r.membro_id),
    email: (r.email as string | null) ?? null,
    nome: (r.nome as string | null) ?? null,
    papel: String(r.papel),
    createdAt: String(r.created_at),
    permissoes: normalizarPermissoes(r.permissoes),
  }));
}

export function paraConvites(data: unknown): ConviteEquipe[] {
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    email: String(r.email_convidado),
    papel: String(r.papel),
    createdAt: String(r.created_at),
    expiraEm: (r.expira_em as string | null) ?? null,
    permissoes: normalizarPermissoes(r.permissoes),
  }));
}

export function paraSetores(data: unknown): SetorAcesso[] {
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    nome: String(r.nome),
    descricao: (r.descricao as string | null) ?? null,
    codigo: String(r.codigo),
    ativo: r.ativo !== false,
    permissoes: normalizarPermissoes(r.permissoes),
  }));
}

/** Resumo legível: "Leads (edição) · Agenda (leitura)". Vazio = "Sem módulos". */
export function resumoPermissoes(
  permissoes: readonly PermissaoModulo[],
  nomes: Record<string, string> = MODULO_ROTULO
): string {
  if (permissoes.length === 0) return "Sem módulos liberados";
  return permissoes
    .map((p) => `${nomes[p.modulo] ?? p.modulo} (${NIVEL_ROTULO[p.nivel].toLowerCase()})`)
    .join(" · ");
}

/** Só módulos da lista branca, nível válido e extras como texto curto. */
export function sanearPermissoes(bruto: unknown): PermissaoModulo[] {
  return normalizarPermissoes(bruto).map((p) => ({
    ...p,
    extras: [...new Set(p.extras.filter((e) => e.length > 0 && e.length <= 40))],
  }));
}

/**
 * Módulos que um formulário pode oferecer: habilitados na empresa E com
 * `permite_membros = true` no catálogo (Vendedores nunca aparece; RH aparece, com o extra de salários).
 */
export function modulosOferecidos(
  habilitados: readonly string[],
  permiteMembros: readonly string[]
): string[] {
  return modulosVisiveis(habilitados, habilitados, permiteMembros);
}

/** Descarta da matriz o que não é oferecido (módulo desligado ou sem permite_membros). */
export function filtrarPermissoesOferecidas(
  permissoes: readonly PermissaoModulo[],
  oferecidos: readonly string[]
): PermissaoModulo[] {
  return permissoes.filter((p) => oferecidos.includes(p.modulo));
}

const SOCIOS_MENSAGENS: [trecho: string, texto: string][] = [
  ["fundador", "Só os fundadores da empresa podem fazer isso."],
  ["permiss", "Sem permissão para esta ação."],
  ["already", "Esta pessoa já faz parte da empresa ou já tem um convite pendente."],
  ["já ", "Esta pessoa já faz parte da empresa ou já tem um convite pendente."],
  ["invalid", "Dados inválidos."],
  ["inválid", "Dados inválidos."],
  ["not_authenticated", "Sessão expirada. Faça login novamente."],
];

/** Traduz o erro de uma RPC da tela de sócios; o que não conhece vira texto genérico. */
export function sociosErrorMessage(message: string | undefined | null): string {
  const m = (message ?? "").toLowerCase();
  const achada = SOCIOS_MENSAGENS.find(([trecho]) => m.includes(trecho));
  return achada?.[1] ?? "Não foi possível concluir a ação. Tente novamente.";
}
