/**
 * Único lugar que decide quais módulos do app estão ligados. O resto do código
 * (menu, proxy, home, busca, banners) pergunta aqui; nada foi apagado dos
 * módulos desligados — as telas, actions e tabelas continuam no repositório,
 * apenas inalcançáveis. Para religar um módulo, inclua-o em
 * MODULOS_HABILITADOS com as rotas dele.
 *
 * Sem dependências de servidor: usado também por componentes client e pelo proxy.
 */

export interface ModuloHabilitado {
  id: string;
  label: string;
  /** Rota de entrada do módulo (a do menu). */
  href: string;
  /**
   * Rotas que pertencem ao módulo (páginas e APIs). Cada prefixo casa o
   * caminho exato ou qualquer subcaminho: "/leads" casa "/leads" e
   * "/leads/x", mas não "/leads-antigo".
   */
  prefixos: string[];
}

export const MODULOS_HABILITADOS: ModuloHabilitado[] = [
  { id: "leads", label: "Leads", href: "/leads", prefixos: ["/leads", "/api/export/leads"] },
  {
    id: "renegados",
    label: "Renegados",
    href: "/renegados",
    prefixos: ["/renegados", "/api/export/renegados"],
  },
  {
    id: "clientes",
    label: "Clientes",
    href: "/clientes",
    prefixos: ["/clientes", "/api/export/clientes"],
  },
  // Follow-ups não têm tela própria: vivem dentro de /leads (card e detalhe
  // do lead), então herdam as rotas do módulo Leads.
  { id: "followups", label: "Follow-ups", href: "/leads", prefixos: [] },
  { id: "agenda", label: "Agenda", href: "/agenda", prefixos: ["/agenda"] },
  { id: "vendedores", label: "Vendedores", href: "/vendedores", prefixos: ["/vendedores"] },
  {
    id: "atividade-vendedores",
    label: "Atividade dos vendedores",
    href: "/atividade-vendedores",
    prefixos: ["/atividade-vendedores"],
  },
];

/**
 * Rotas que não são "módulo" e nunca são bloqueadas por esta lista: acesso
 * (login, cadastro, convite, código do vendedor), a área do vendedor (que tem
 * a própria guarda), a home do dono (/dashboard, só a raiz) e a Conta Pessoal.
 * "/" casa só ela mesma.
 */
const ROTAS_LIVRES_EXATAS = ["/", "/dashboard"];
const ROTAS_LIVRES_PREFIXOS = [
  "/login",
  "/signup",
  "/convite",
  "/acesso-vendedor",
  "/vendedor",
  "/pessoal",
  "/api/pessoal",
  "/api/auth",
];

function casaPrefixo(path: string, prefixo: string) {
  return path === prefixo || path.startsWith(`${prefixo}/`);
}

/** True se o caminho pertence a um módulo ligado ou é uma rota livre. */
export function isRotaHabilitada(path: string): boolean {
  if (ROTAS_LIVRES_EXATAS.includes(path)) return true;
  if (ROTAS_LIVRES_PREFIXOS.some((p) => casaPrefixo(path, p))) return true;
  return MODULOS_HABILITADOS.some((m) => m.prefixos.some((p) => casaPrefixo(path, p)));
}

/** Para onde vai quem abre uma rota de módulo desligado (o dono). */
export const ROTA_PADRAO_DONO = "/leads";
