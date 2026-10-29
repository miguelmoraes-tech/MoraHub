/**
 * Preferências de navegação (tabela `menu_preferencias`): ordem e visibilidade dos itens do menu
 * e abas ocultas de cada tela. Só APARÊNCIA: nunca muda módulos ligados, permissões nem dados, e
 * esconder um item não bloqueia a rota (o acesso direto continua regido pela permissão).
 *
 * Hierarquia: preferência pessoal → padrão da empresa (user_id nulo) → ordem do registro. Sem
 * nenhuma linha o menu é exatamente o de antes (o snapshot das empresas atuais não muda).
 * Sem banco e sem React: serve ao servidor, aos componentes client e aos testes.
 */
import {
  ABAS_VISAO_GERAL, CHAVE_VISAO_GERAL, getModuloRegistro, menuDoDono, type AbaRegistro, type IconeNome, type ItemMenu,
} from "@/lib/modulos/registry";

/** Formato aceito pelo banco para a chave de um item. */
export const CHAVE_VALIDA = /^[a-z0-9_/-]{1,80}$/;
export const MAX_ITENS = 200;

export interface ItemPreferencia {
  chave: string;
  visivel: boolean;
  ordem: number;
}

export interface Preferencia {
  itens: ItemPreferencia[];
  /** chave do módulo (ou "visao_geral") → chaves das abas ocultas. */
  abasOcultas: Record<string, string[]>;
}

// --- Itens do menu -----------------------------------------------------------------------------

/** Item do menu com o mínimo que a preferência precisa (o href identifica o item). */
export interface ItemNavegacao {
  label: string;
  href: string;
  /** Ícone do registro (itens de módulo); os fixos ganham o ícone na barra lateral. */
  icone?: IconeNome;
  badge?: "solicitacoes" | "aprovacoes";
}

export interface GrupoNavegacao<T = ItemNavegacao> {
  titulo: string;
  itens: T[];
}

export const ITEM_VISAO_GERAL: ItemNavegacao = { label: "Visão Geral", href: "/dashboard" };
export const ITENS_EMPRESA: ItemNavegacao[] = [
  { label: "Módulos", href: "/modulos" },
  { label: "Equipe e cofundadores", href: "/socios" },
  { label: "Aprovações", href: "/aprovacoes", badge: "aprovacoes" },
  { label: "Configurações", href: "/configuracoes" },
];

/** "/impressao-3d/estoque" → "impressao-3d/estoque"; é a chave guardada na preferência. */
export function chaveDoHref(href: string): string {
  return href.replace(/^\/+/, "");
}

/**
 * Visão Geral, Módulos, Equipe e cofundadores e Configurações nunca podem ser ocultados (ninguém se
 * tranca para fora, e quem funda a empresa sempre acha onde convidar um cofundador). Equipe só
 * existe no menu de fundador/cofundador, então a regra não afeta sócios e funcionários.
 */
export const ITENS_FIXOS = ["dashboard", "modulos", "socios", "configuracoes"] as const;
export function itemFixo(chave: string): boolean {
  return (ITENS_FIXOS as readonly string[]).includes(chave);
}

/**
 * Os grupos do menu que a pessoa JÁ pode ver, na ordem do registro: Visão Geral (quem não é
 * sócio/funcionário), os módulos visíveis (registro ∩ ligados ∩ permissão, já em `modulosVisiveis`)
 * e o bloco Empresa (só fundador/cofundador). É exatamente o que a barra lateral montava antes.
 */
export function gruposDoMenu(
  modulosVisiveis: readonly string[],
  painelCompleto: boolean,
  restrito: boolean
): GrupoNavegacao[] {
  const grupos: GrupoNavegacao[] = [];
  if (!restrito) grupos.push({ titulo: "Dashboards", itens: [ITEM_VISAO_GERAL] });
  for (const g of menuDoDono(modulosVisiveis)) {
    grupos.push({
      titulo: g.titulo,
      itens: g.itens.map((i: ItemMenu) => ({ label: i.label, href: i.href, icone: i.icone, ...(i.badge ? { badge: i.badge } : {}) })),
    });
  }
  if (painelCompleto) grupos.push({ titulo: "Empresa", itens: ITENS_EMPRESA });
  return grupos;
}

/**
 * Aplica a preferência: dentro de cada grupo, itens com preferência vão pela `ordem` (empate =
 * ordem do registro) e itens sem preferência (módulo ligado depois) entram no fim, visíveis.
 * Itens ocultos saem, menos os fixos. Grupo sem item visível some. Sem preferência, devolve os
 * MESMOS grupos (identidade): o menu das empresas sem preferência não muda em nada.
 * Preferência de item que não está na lista (módulo desligado) fica guardada e só é ignorada.
 */
export function aplicarPreferenciaMenu<T extends { href: string }>(
  grupos: GrupoNavegacao<T>[],
  pref: Preferencia | null
): GrupoNavegacao<T>[] {
  if (!pref || pref.itens.length === 0) return grupos;
  const saida: GrupoNavegacao<T>[] = [];
  for (const g of ordenarComPreferencia(grupos, pref)) {
    const itens = g.itens.filter((x) => x.visivel).map((x) => x.item);
    if (itens.length > 0) saida.push({ titulo: g.titulo, itens });
  }
  return saida;
}

export interface ItemOrdenado<T> {
  item: T;
  chave: string;
  /** Fixos sempre true. */
  visivel: boolean;
}

/**
 * Os grupos na ordem da preferência, SEM tirar os ocultos (a tela de personalização mostra todos).
 * Itens sem preferência (módulo ligado depois) vão para o fim do grupo, visíveis.
 */
export function ordenarComPreferencia<T extends { href: string }>(
  grupos: GrupoNavegacao<T>[],
  pref: Preferencia | null
): GrupoNavegacao<ItemOrdenado<T>>[] {
  const porChave = new Map((pref?.itens ?? []).map((i) => [i.chave, i]));
  return grupos.map((g) => ({
    titulo: g.titulo,
    itens: g.itens
      .map((item, pos) => ({ item, pos, chave: chaveDoHref(item.href), p: porChave.get(chaveDoHref(item.href)) }))
      .sort((a, b) => {
        if (a.p && b.p) return a.p.ordem - b.p.ordem || a.pos - b.pos;
        if (a.p) return -1;
        if (b.p) return 1;
        return a.pos - b.pos;
      })
      .map((x) => ({ item: x.item, chave: x.chave, visivel: !x.p || x.p.visivel || itemFixo(x.chave) })),
  }));
}

// --- Abas ----------------------------------------------------------------------------------------

/** Abas que uma chave (módulo ou "visao_geral") tem no registro. */
export function abasDe(chave: string): AbaRegistro[] {
  if (chave === CHAVE_VISAO_GERAL) return ABAS_VISAO_GERAL;
  return getModuloRegistro(chave)?.abas ?? [];
}

/**
 * Chaves das abas visíveis, na ordem do registro. Nunca vazia: se a preferência ocultar todas
 * (formato antigo ou corrida), volta a primeira (a aba padrão).
 */
export function abasVisiveis(chave: string, pref: Preferencia | null): string[] {
  const todas = abasDe(chave).map((a) => a.chave);
  const ocultas = new Set(pref?.abasOcultas[chave] ?? []);
  const visiveis = todas.filter((a) => !ocultas.has(a));
  return visiveis.length > 0 ? visiveis : todas.slice(0, 1);
}

/** Aba que a tela abre: a pedida (ou a padrão) se estiver visível; senão a primeira visível. */
export function abaInicial<T extends string>(visiveis: readonly string[], desejada: T): T {
  return (visiveis.includes(desejada) ? desejada : (visiveis[0] ?? desejada)) as T;
}

// --- Leitura e validação -------------------------------------------------------------------------

function lerItens(bruto: unknown): ItemPreferencia[] {
  if (!Array.isArray(bruto)) return [];
  const vistos = new Set<string>();
  const saida: ItemPreferencia[] = [];
  for (const x of bruto.slice(0, MAX_ITENS)) {
    if (!x || typeof x !== "object") continue;
    const { chave, visivel, ordem } = x as Record<string, unknown>;
    if (typeof chave !== "string" || !CHAVE_VALIDA.test(chave) || vistos.has(chave)) continue;
    if (typeof visivel !== "boolean" || typeof ordem !== "number" || !Number.isFinite(ordem)) continue;
    vistos.add(chave);
    saida.push({ chave, visivel, ordem });
  }
  return saida;
}

function lerAbas(bruto: unknown): Record<string, string[]> {
  if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) return {};
  const saida: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(bruto as Record<string, unknown>)) {
    if (!CHAVE_VALIDA.test(k) || !Array.isArray(v)) continue;
    const abas = [...new Set(v.filter((a): a is string => typeof a === "string" && CHAVE_VALIDA.test(a)))];
    if (abas.length > 0) saida[k] = abas;
  }
  return saida;
}

/** Linha de `menu_preferencias` (não confiável) → Preferencia; null sem linha. */
export function lerPreferencia(linha: unknown): Preferencia | null {
  if (!linha || typeof linha !== "object") return null;
  const r = linha as Record<string, unknown>;
  return { itens: lerItens(r.itens), abasOcultas: lerAbas(r.abas_ocultas) };
}

/** Pessoal, senão o padrão da empresa, senão nada (ordem do registro). */
export function resolverPreferencia(pessoal: Preferencia | null, padrao: Preferencia | null): Preferencia | null {
  return pessoal ?? padrao ?? null;
}

export interface ContextoPreferencia {
  /** Chaves dos itens que a pessoa vê hoje (os únicos que ela pode mudar agora). */
  itensVisiveis: readonly string[];
  /** Chaves (módulos e "visao_geral") cujas abas a pessoa vê hoje. */
  chavesComAbas: readonly string[];
}

export type ResultadoPreferencia = { ok: true; pref: Preferencia } | { ok: false; erro: string };

/**
 * Prepara a preferência a gravar. Só aceita itens e abas que a pessoa vê agora; fixos ficam sempre
 * visíveis; cada tela mantém ao menos 1 aba. O que estava guardado para itens/telas que ela NÃO vê
 * agora (módulo desligado, permissão retirada) é preservado, para voltar igual quando religar.
 */
export function prepararPreferencia(
  entrada: unknown,
  ctx: ContextoPreferencia,
  atual: Preferencia | null
): ResultadoPreferencia {
  const e = (entrada && typeof entrada === "object" ? entrada : {}) as Record<string, unknown>;
  const visiveis = new Set(ctx.itensVisiveis);

  const novos = lerItens(e.itens)
    .filter((i) => visiveis.has(i.chave))
    .map((i) => (itemFixo(i.chave) ? { ...i, visivel: true } : i));
  const guardados = (atual?.itens ?? []).filter((i) => !visiveis.has(i.chave));
  const itens = [...novos, ...guardados.filter((g) => !novos.some((n) => n.chave === g.chave))];

  const abasEntrada = lerAbas(e.abasOcultas);
  const abasOcultas: Record<string, string[]> = {};
  for (const [chave, ocultas] of Object.entries(abasEntrada)) {
    if (!ctx.chavesComAbas.includes(chave)) continue;
    const todas = abasDe(chave).map((a) => a.chave);
    const validas = ocultas.filter((a) => todas.includes(a));
    if (validas.length >= todas.length) {
      const nome = chave === CHAVE_VISAO_GERAL ? "Visão Geral" : (getModuloRegistro(chave)?.menu[0]?.label ?? chave);
      return { ok: false, erro: `Deixe pelo menos uma aba visível em ${nome}.` };
    }
    if (validas.length > 0) abasOcultas[chave] = validas;
  }
  for (const [chave, ocultas] of Object.entries(atual?.abasOcultas ?? {})) {
    if (!ctx.chavesComAbas.includes(chave)) abasOcultas[chave] = ocultas;
  }

  if (itens.length > MAX_ITENS) return { ok: false, erro: "Itens demais na preferência." };
  return { ok: true, pref: { itens, abasOcultas } };
}
