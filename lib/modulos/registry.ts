/**
 * Registro dos módulos do app: a única fonte de rotas e de itens de menu.
 * Menu, proxy, home e busca perguntam aqui; nada é decidido por nicho ou por
 * `if` espalhado. Sem dependências de servidor nem de React — também é
 * importado pelo proxy e por componentes client (os ícones são só o nome do
 * ícone do lucide, resolvido em components/modulos/icones.ts).
 *
 * Adicionar um módulo = uma entrada em MODULOS abaixo + uma linha em `modulos`
 * (catálogo no banco). O registro diz O QUE o código sabe fazer; quais módulos
 * cada empresa usa vem de `workspace_modulos` (lib/modulos/habilitados.ts), e
 * `modulos.ativo` diz se o módulo já pode ser ligado.
 */

/** Nome de um ícone do lucide-react, mapeado em components/modulos/icones.ts. */
export type IconeNome =
  | "target"
  | "user-x"
  | "users"
  | "calendar-clock"
  | "user-check"
  | "activity"
  | "credit-card"
  | "hand-coins"
  | "pie-chart"
  | "line-chart"
  | "trending-up"
  | "landmark"
  | "file-bar-chart"
  | "receipt"
  | "badge-check"
  | "wallet"
  | "building-2"
  | "palmtree"
  | "gift"
  | "banknote"
  | "briefcase"
  | "clipboard-check"
  | "clock"
  | "layout-grid"
  | "calendar-days"
  | "megaphone"
  | "scale"
  | "file-text"
  | "file-stack"
  | "gavel"
  | "shield-check"
  | "copyright"
  | "blocks";

export interface ItemMenu {
  label: string;
  href: string;
  icone: IconeNome;
  /** Título do bloco do menu em que o item aparece. */
  grupo: string;
  /** Contador ao vivo no fim do item (vem de um provider). */
  badge?: "solicitacoes";
}

export interface ModuloRegistro {
  /** Mesma chave da linha em `modulos`. */
  chave: string;
  /**
   * Prefixos de rota (páginas e APIs) do módulo. Cada prefixo casa o caminho
   * exato ou qualquer subcaminho: "/leads" casa "/leads" e "/leads/x", mas
   * não "/leads-antigo".
   */
  rotas: string[];
  icone: IconeNome;
  menu: ItemMenu[];
  /**
   * Tabelas que o módulo lê/grava. Só serve de documentação e de checklist:
   * um módulo só entra como `ativo` no catálogo quando todas elas isolam por
   * empresa (workspace_id) na RLS.
   */
  tabelas: string[];
}

export const GRUPOS_MENU = [
  "Gestão",
  "Vendedores",
  "Financeiro",
  "Jurídico & Contábil",
  "RH",
  "Marketing",
] as const;

export const MODULOS: ModuloRegistro[] = [
  {
    chave: "leads",
    rotas: ["/leads", "/api/export/leads"],
    icone: "target",
    // Follow-ups e propostas vivem dentro de /leads (card e detalhe do lead).
    tabelas: ["leads", "followups_lead", "propostas", "lead_views"],
    menu: [{ label: "Leads", href: "/leads", icone: "target", grupo: "Gestão" }],
  },
  {
    chave: "renegados",
    rotas: ["/renegados", "/api/export/renegados"],
    icone: "user-x",
    tabelas: ["renegados"],
    menu: [{ label: "Renegados", href: "/renegados", icone: "user-x", grupo: "Gestão" }],
  },
  {
    chave: "clientes",
    rotas: ["/clientes", "/api/export/clientes"],
    icone: "users",
    // Só a lista. O detalhe /clientes/[id] (acessos, assinaturas, backups,
    // comprovantes, contratos, infraestrutura, manutencoes, projetos,
    // servicos) ainda não isola por empresa: fica só para o dono e fora das
    // permissões de sócio até a RLS dessas tabelas ser corrigida.
    tabelas: ["clientes"],
    menu: [{ label: "Clientes", href: "/clientes", icone: "users", grupo: "Gestão" }],
  },
  {
    chave: "agenda",
    rotas: ["/agenda"],
    icone: "calendar-clock",
    tabelas: ["reunioes"],
    menu: [{ label: "Agenda", href: "/agenda", icone: "calendar-clock", grupo: "Vendedores" }],
  },
  {
    chave: "vendedores",
    rotas: ["/vendedores", "/atividade-vendedores"],
    icone: "user-check",
    tabelas: ["solicitacoes_vendedor", "workspace_codigos", "membros", "convites", "lead_views"],
    menu: [
      {
        label: "Atividade dos vendedores",
        href: "/atividade-vendedores",
        icone: "activity",
        grupo: "Vendedores",
      },
      {
        label: "Vendedores",
        href: "/vendedores",
        icone: "user-check",
        grupo: "Vendedores",
        badge: "solicitacoes",
      },
    ],
  },
  // --- Módulos novos (Fase 3.5): Financeiro, RH, Marketing e Jurídico. O código
  // lê e grava por workspace_id e as tabelas isolam por empresa na RLS. Seguem
  // "em breve" no catálogo (modulos.ativo = false) até serem ligados; a rota é
  // reconhecida como de um módulo e bloqueada enquanto ele estiver desligado.
  {
    chave: "financeiro",
    rotas: [
      "/contas-pagar",
      "/contas-receber",
      "/orcamentos",
      "/fluxo-caixa",
      "/rentabilidade",
      "/conciliacao",
      "/dre",
      "/gastos",
      "/assinantes",
      "/api/export/dre",
      "/dashboard/financeiro",
    ],
    icone: "wallet",
    tabelas: [
      "contas_pagar",
      "contas_receber",
      "orcamentos",
      "gastos",
      "comprovantes",
      "lancamentos_extrato",
      "assinaturas",
    ],
    menu: [
      { label: "Contas a Pagar", href: "/contas-pagar", icone: "credit-card", grupo: "Financeiro" },
      { label: "Contas a Receber", href: "/contas-receber", icone: "hand-coins", grupo: "Financeiro" },
      { label: "Orçamento", href: "/orcamentos", icone: "pie-chart", grupo: "Financeiro" },
      { label: "Fluxo de Caixa", href: "/fluxo-caixa", icone: "line-chart", grupo: "Financeiro" },
      { label: "Rentabilidade", href: "/rentabilidade", icone: "trending-up", grupo: "Financeiro" },
      { label: "Conciliação Bancária", href: "/conciliacao", icone: "landmark", grupo: "Financeiro" },
      { label: "DRE", href: "/dre", icone: "file-bar-chart", grupo: "Financeiro" },
      { label: "Gastos", href: "/gastos", icone: "receipt", grupo: "Financeiro" },
      { label: "Assinantes", href: "/assinantes", icone: "badge-check", grupo: "Financeiro" },
    ],
  },
  {
    chave: "rh",
    rotas: ["/rh"],
    icone: "users",
    tabelas: [
      "departamentos",
      "funcionarios",
      "ferias",
      "beneficios",
      "folha_pagamento",
      "vagas",
      "candidatos",
      "avaliacoes_desempenho",
      "controle_ponto",
    ],
    menu: [
      { label: "Visão Geral", href: "/rh", icone: "layout-grid", grupo: "RH" },
      { label: "Departamentos", href: "/rh/departamentos", icone: "building-2", grupo: "RH" },
      { label: "Funcionários", href: "/rh/funcionarios", icone: "users", grupo: "RH" },
      { label: "Férias", href: "/rh/ferias", icone: "palmtree", grupo: "RH" },
      { label: "Benefícios", href: "/rh/beneficios", icone: "gift", grupo: "RH" },
      { label: "Folha de Pagamento", href: "/rh/folha", icone: "banknote", grupo: "RH" },
      { label: "Recrutamento", href: "/rh/recrutamento", icone: "briefcase", grupo: "RH" },
      { label: "Avaliações", href: "/rh/avaliacoes", icone: "clipboard-check", grupo: "RH" },
      { label: "Ponto", href: "/rh/ponto", icone: "clock", grupo: "RH" },
    ],
  },
  {
    chave: "marketing",
    rotas: ["/marketing"],
    icone: "megaphone",
    tabelas: ["campanhas", "calendario_conteudo"],
    menu: [
      { label: "Visão Geral", href: "/marketing", icone: "layout-grid", grupo: "Marketing" },
      {
        label: "Calendário de Conteúdo",
        href: "/marketing/calendario",
        icone: "calendar-days",
        grupo: "Marketing",
      },
      { label: "Campanhas", href: "/marketing/campanhas", icone: "megaphone", grupo: "Marketing" },
    ],
  },
  {
    chave: "juridico",
    rotas: ["/juridico", "/documentos"],
    icone: "scale",
    tabelas: [
      "juridico",
      "processos",
      "compliance_juridico",
      "propriedade_intelectual",
      "modelos_contrato",
      "documentos",
    ],
    menu: [
      { label: "Jurídico & Contábil", href: "/juridico", icone: "scale", grupo: "Jurídico & Contábil" },
      { label: "Processos", href: "/juridico/processos", icone: "gavel", grupo: "Jurídico & Contábil" },
      { label: "Compliance", href: "/juridico/compliance", icone: "shield-check", grupo: "Jurídico & Contábil" },
      {
        label: "Propriedade Intelectual",
        href: "/juridico/propriedade-intelectual",
        icone: "copyright",
        grupo: "Jurídico & Contábil",
      },
      {
        label: "Modelos de Contrato",
        href: "/juridico/modelos-contrato",
        icone: "file-stack",
        grupo: "Jurídico & Contábil",
      },
      { label: "Documentos", href: "/documentos", icone: "file-text", grupo: "Jurídico & Contábil" },
    ],
  },
];

const POR_CHAVE = new Map(MODULOS.map((m) => [m.chave, m]));

export function getModuloRegistro(chave: string): ModuloRegistro | undefined {
  return POR_CHAVE.get(chave);
}

// --- Rotas que não pertencem a módulo ---

/** Home do dono e raiz: casam só elas mesmas. */
const ROTAS_LIVRES_EXATAS = ["/", "/dashboard"];
/**
 * Acesso (login, cadastro, convite, código do vendedor, criação da empresa),
 * a área do vendedor (que tem a própria guarda), as páginas de Módulos e
 * Sócios (a própria página confere que quem abre é o fundador/cofundador;
 * para sócio e funcionário o proxy as bloqueia em lib/acesso.ts) e a Conta
 * Pessoal.
 */
const ROTAS_LIVRES_PREFIXOS = [
  "/login",
  "/signup",
  "/convite",
  "/acesso-vendedor",
  "/nova-empresa",
  "/vendedor",
  "/modulos",
  "/socios",
  "/configuracoes",
  "/pessoal",
  "/api/pessoal",
  "/api/auth",
];

/** Rotas de produtos que não são módulos do catálogo e seguem fora do ar. */
export const CHAT_HABILITADO = false;
export const VENCIMENTOS_HABILITADO = false;
export const COLABORADOR_HABILITADO = false;

/** Rota inicial do dono. */
export const HOME_DONO = "/dashboard";

function casaPrefixo(path: string, prefixo: string) {
  return path === prefixo || path.startsWith(`${prefixo}/`);
}

export function isRotaLivre(path: string): boolean {
  return (
    ROTAS_LIVRES_EXATAS.includes(path) ||
    ROTAS_LIVRES_PREFIXOS.some((p) => casaPrefixo(path, p))
  );
}

/** Chave do módulo dono da rota, ou null se nenhum módulo a reivindica. */
export function moduloDaRota(path: string): string | null {
  for (const m of MODULOS) {
    if (m.rotas.some((p) => casaPrefixo(path, p))) return m.chave;
  }
  return null;
}

/**
 * True se o caminho é uma rota livre ou pertence a um módulo habilitado.
 * Rota que nenhum módulo reivindica (ex.: /metas, /chat) fica bloqueada.
 */
export function rotaPermitida(path: string, habilitados: readonly string[]): boolean {
  if (isRotaLivre(path)) return true;
  const chave = moduloDaRota(path);
  return chave !== null && habilitados.includes(chave);
}

/** Onde cai quem abre uma rota de módulo desligado: a 1ª rota do 1º módulo ligado. */
export function primeiraRotaHabilitada(habilitados: readonly string[]): string | null {
  for (const m of MODULOS) {
    if (habilitados.includes(m.chave) && m.menu.length > 0) return m.menu[0].href;
  }
  return null;
}

export interface GrupoMenu {
  titulo: string;
  itens: ItemMenu[];
}

/** Menu do dono: registro ∩ módulos habilitados, agrupado na ordem de GRUPOS_MENU. */
export function menuDoDono(habilitados: readonly string[]): GrupoMenu[] {
  const itensPorGrupo = new Map<string, ItemMenu[]>();
  for (const m of MODULOS) {
    if (!habilitados.includes(m.chave)) continue;
    for (const item of m.menu) {
      itensPorGrupo.set(item.grupo, [...(itensPorGrupo.get(item.grupo) ?? []), item]);
    }
  }
  return GRUPOS_MENU.filter((g) => itensPorGrupo.has(g)).map((g) => ({
    titulo: g,
    itens: itensPorGrupo.get(g)!,
  }));
}
