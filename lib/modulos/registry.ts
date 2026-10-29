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
  | "blocks"
  | "printer"
  | "boxes"
  | "package"
  | "calculator"
  | "file-spreadsheet"
  | "shopping-cart"
  | "clipboard-list"
  | "factory"
  | "truck"
  | "gauge"
  | "bar-chart-3"
  | "bell"
  | "plug";

export interface ItemMenu {
  label: string;
  href: string;
  icone: IconeNome;
  /** Título do bloco do menu em que o item aparece. */
  grupo: string;
  /** Contador ao vivo no fim do item (vem de um provider). */
  badge?: "solicitacoes";
}

/**
 * Aba (ou seção) de uma tela, com chave estável: é o que a preferência de navegação guarda em
 * `menu_preferencias.abas_ocultas`. A primeira da lista é a aba padrão da tela.
 */
export interface AbaRegistro {
  chave: string;
  rotulo: string;
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
  /** Abas da tela do módulo que podem ser ocultadas (mínimo de 1 visível). A 1ª é a padrão. */
  abas?: AbaRegistro[];
}

export const GRUPOS_MENU = [
  "Gestão",
  "Vendedores",
  "Financeiro",
  "Jurídico & Contábil",
  "RH",
  "Marketing",
  "Impressão 3D",
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
  // --- Nicho Impressão 3D (Etapa A). Tabelas p3d_* isolam por workspace_id na RLS.
  // O catálogo (modulos.ativo) segue false até a ativação manual. Os extras "custos" de
  // Estoque e Orçamentos são só de tela (esconder custo, lucro e margem).
  {
    chave: "p3d_impressoras",
    rotas: ["/impressao-3d/impressoras"],
    icone: "printer",
    tabelas: ["p3d_impressoras", "p3d_pecas_desgaste", "p3d_manutencoes"],
    abas: [{ chave: "dados", rotulo: "Dados" }, { chave: "pecas", rotulo: "Peças de desgaste" }, { chave: "manutencoes", rotulo: "Manutenções" }],
    menu: [
      { label: "Impressoras", href: "/impressao-3d/impressoras", icone: "printer", grupo: "Impressão 3D" },
    ],
  },
  {
    chave: "p3d_estoque",
    rotas: ["/impressao-3d/estoque"],
    icone: "boxes",
    tabelas: ["p3d_materiais", "p3d_movimentos_estoque"],
    abas: [{ chave: "materiais", rotulo: "Materiais" }, { chave: "historico", rotulo: "Histórico de movimentos" }],
    menu: [{ label: "Estoque", href: "/impressao-3d/estoque", icone: "boxes", grupo: "Impressão 3D" }],
  },
  {
    chave: "p3d_produtos",
    rotas: ["/impressao-3d/produtos"],
    icone: "package",
    tabelas: ["p3d_produtos", "p3d_produto_variacoes", "p3d_produto_arquivos"],
    menu: [
      { label: "Produtos e catálogo", href: "/impressao-3d/produtos", icone: "package", grupo: "Impressão 3D" },
    ],
  },
  {
    chave: "p3d_precificacao",
    rotas: ["/impressao-3d/precificacao"],
    icone: "calculator",
    tabelas: ["p3d_config_precificacao"],
    abas: [{ chave: "simulador", rotulo: "Simulador" }, { chave: "config", rotulo: "Configurações da empresa" }],
    menu: [
      { label: "Precificação", href: "/impressao-3d/precificacao", icone: "calculator", grupo: "Impressão 3D" },
    ],
  },
  {
    chave: "p3d_orcamentos",
    rotas: ["/impressao-3d/orcamentos"],
    icone: "file-spreadsheet",
    tabelas: ["p3d_orcamentos", "p3d_orcamento_itens"],
    menu: [
      { label: "Orçamentos 3D", href: "/impressao-3d/orcamentos", icone: "file-spreadsheet", grupo: "Impressão 3D" },
    ],
  },
  // --- Nicho Impressão 3D (Etapa B). O extra "custos" de Pedidos esconde custo, lucro e margem.
  {
    chave: "p3d_fornecedores",
    rotas: ["/impressao-3d/fornecedores"],
    icone: "shopping-cart",
    tabelas: ["p3d_fornecedores", "p3d_compras", "p3d_compra_itens"],
    abas: [{ chave: "compras", rotulo: "Compras" }, { chave: "fornecedores", rotulo: "Fornecedores" }, { chave: "precos", rotulo: "Preços" }],
    menu: [
      { label: "Fornecedores e compras", href: "/impressao-3d/fornecedores", icone: "shopping-cart", grupo: "Impressão 3D" },
    ],
  },
  {
    chave: "p3d_pedidos",
    rotas: ["/impressao-3d/pedidos"],
    icone: "clipboard-list",
    tabelas: ["p3d_pedidos", "p3d_pedido_itens", "p3d_pedido_pagamentos", "p3d_pedido_historico"],
    menu: [{ label: "Pedidos e vendas", href: "/impressao-3d/pedidos", icone: "clipboard-list", grupo: "Impressão 3D" }],
  },
  {
    chave: "p3d_producao",
    rotas: ["/impressao-3d/producao"],
    icone: "factory",
    tabelas: ["p3d_producao"],
    abas: [{ chave: "fila", rotulo: "Na fila" }, { chave: "imprimindo", rotulo: "Imprimindo" }, { chave: "concluida", rotulo: "Concluída" }, { chave: "falhou", rotulo: "Falhou" }, { chave: "cancelada", rotulo: "Cancelada" }, { chave: "produtividade", rotulo: "Produtividade" }],
    menu: [{ label: "Produção", href: "/impressao-3d/producao", icone: "factory", grupo: "Impressão 3D" }],
  },
  {
    chave: "p3d_qualidade",
    rotas: ["/impressao-3d/qualidade"],
    icone: "shield-check",
    tabelas: ["p3d_inspecoes", "p3d_falhas"],
    abas: [{ chave: "pendentes", rotulo: "Para inspecionar" }, { chave: "historico", rotulo: "Histórico" }, { chave: "indicadores", rotulo: "Indicadores" }],
    menu: [{ label: "Qualidade", href: "/impressao-3d/qualidade", icone: "shield-check", grupo: "Impressão 3D" }],
  },
  {
    chave: "p3d_expedicao",
    rotas: ["/impressao-3d/expedicao"],
    icone: "truck",
    tabelas: ["p3d_envios"],
    menu: [{ label: "Expedição", href: "/impressao-3d/expedicao", icone: "truck", grupo: "Impressão 3D" }],
  },
  // --- Nicho Impressão 3D (Etapa C-1). Dashboard e Relatórios têm o extra "custos" (custo, lucro e
  // margem só de tela). Automações: notificações dentro do app (sem e-mail/WhatsApp/push).
  // Integrações: só estrutura, sem conexão real.
  {
    chave: "p3d_dashboard",
    rotas: ["/impressao-3d/dashboard"],
    icone: "gauge",
    // Sem tabela própria: lê por RPC (p3d_painel) e dispara p3d_atualizar_alertas.
    tabelas: [],
    abas: [{ chave: "vendas", rotulo: "Vendas" }, { chave: "resultado", rotulo: "Resultado" }, { chave: "producao", rotulo: "Produção" }, { chave: "alertas", rotulo: "Alertas" }],
    menu: [{ label: "Dashboard 3D", href: "/impressao-3d/dashboard", icone: "gauge", grupo: "Impressão 3D" }],
  },
  {
    chave: "p3d_relatorios",
    rotas: ["/impressao-3d/relatorios"],
    icone: "bar-chart-3",
    // Sem tabela própria: só RPCs de leitura (p3d_relatorio_*).
    tabelas: [],
    abas: [{ chave: "vendas", rotulo: "Vendas" }, { chave: "produtos", rotulo: "Produtos" }, { chave: "produtividade", rotulo: "Produtividade" }],
    menu: [{ label: "Relatórios 3D", href: "/impressao-3d/relatorios", icone: "bar-chart-3", grupo: "Impressão 3D" }],
  },
  {
    chave: "p3d_automacoes",
    rotas: ["/impressao-3d/notificacoes"],
    icone: "bell",
    tabelas: ["p3d_notificacoes", "p3d_config_alertas"],
    abas: [{ chave: "abertas", rotulo: "Abertas" }, { chave: "resolvidas", rotulo: "Resolvidas" }, { chave: "todas", rotulo: "Todas" }],
    menu: [{ label: "Notificações e alertas", href: "/impressao-3d/notificacoes", icone: "bell", grupo: "Impressão 3D" }],
  },
  {
    chave: "p3d_integracoes",
    rotas: ["/impressao-3d/integracoes"],
    icone: "plug",
    tabelas: ["p3d_integracoes"],
    menu: [{ label: "Integrações", href: "/impressao-3d/integracoes", icone: "plug", grupo: "Impressão 3D" }],
  },
];

/** Chave da Visão Geral do dono no mecanismo de abas (não é módulo). */
export const CHAVE_VISAO_GERAL = "visao_geral";
/** Seções da Visão Geral que podem ser ocultadas (mínimo de 1 visível). */
export const ABAS_VISAO_GERAL: AbaRegistro[] = [
  { chave: "primeiros_passos", rotulo: "Primeiros passos" },
  { chave: "resumo", rotulo: "Resumo dos módulos" },
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
  "/aprovacoes",
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
