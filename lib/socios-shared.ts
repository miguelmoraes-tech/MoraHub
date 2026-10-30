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

/** Uma pessoa da lista "Equipe": fundadores e cofundadores (fundadores_da_empresa) + membros (listar_membros_empresa). */
export interface PessoaEquipe extends MembroEquipe {
  /** Entrada que só existe em fundadores_da_empresa (sem linha de membro): não tem o que remover nem editar. */
  semMembro: boolean;
}

/**
 * Junta fundadores e membros numa lista só, sem repetir ninguém (pelo e-mail). Fundador original ('dono')
 * nunca é removível; cofundador, sócio e funcionário são (a RPC confere de novo). Quem só aparece na
 * lista de fundadores entra como "semMembro".
 */
export function montarPessoas(
  fundadores: readonly { user_id: string; nome: string | null; email: string | null; papel: string }[],
  membros: readonly MembroEquipe[]
): PessoaEquipe[] {
  const pessoas: PessoaEquipe[] = membros.map((m) => ({ ...m, semMembro: false }));
  const emails = new Set(pessoas.flatMap((p) => (p.email ? [p.email.trim().toLowerCase()] : [])));
  const ids = new Set(pessoas.map((p) => p.membroId));
  for (const f of fundadores) {
    const email = f.email?.trim().toLowerCase();
    if ((email && emails.has(email)) || ids.has(f.user_id)) continue;
    pessoas.push({
      membroId: f.user_id,
      email: f.email,
      nome: f.nome,
      papel: f.papel,
      createdAt: "",
      permissoes: [],
      semMembro: true,
    });
  }
  const ordem: Record<string, number> = { dono: 0, cofundador: 1, socio: 2, funcionario: 3, comercial: 4 };
  return pessoas.sort((a, b) => (ordem[a.papel] ?? 9) - (ordem[b.papel] ?? 9));
}

/** O fundador original e quem não tem linha de membro não são removíveis pela tela; ninguém remove a si mesmo. */
export function pessoaRemovivel(p: Pick<PessoaEquipe, "papel" | "semMembro" | "membroId">, meuId: string): boolean {
  if (p.papel === "dono" || p.semMembro || p.membroId === meuId) return false;
  return p.papel === "socio" || p.papel === "funcionario" || p.papel === "cofundador";
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

/** Quando a RPC não traz mensagem nenhuma. */
const ERRO_SEM_MENSAGEM = "Não foi possível concluir a ação. Tente novamente.";

/**
 * Erro de uma RPC da tela de Equipe: o texto do banco é mostrado COMO VEIO (as RPCs levantam mensagens em
 * português). Traduzir por trecho escondia a causa — ex.: qualquer erro que citasse "fundador" virava
 * "Só os fundadores podem fazer isso", mesmo para o fundador. Só a sessão expirada ganha texto próprio.
 */
export function sociosErrorMessage(message: string | undefined | null): string {
  const texto = (message ?? "").trim();
  if (!texto) return ERRO_SEM_MENSAGEM;
  if (texto.toLowerCase().includes("not_authenticated")) return "Sessão expirada. Faça login novamente.";
  return texto;
}
