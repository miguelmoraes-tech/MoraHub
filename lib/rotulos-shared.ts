/**
 * Rótulos por empresa (nichos e modelos): como cada módulo se chama nas telas.
 * Sem dependências de servidor nem de React — serve ao servidor, aos
 * componentes client e aos testes.
 *
 * A fonte é `workspace_config.config.labels` (uma empresa sem linha ali, como
 * as atuais, não tem rótulo nenhum). Sem rótulo, tudo devolve exatamente o
 * texto que o app já usava (ROTULOS_PADRAO e os `padrao` de cada tela): é o
 * que mantém as empresas atuais idênticas. Nada aqui decide por nicho: nicho e
 * modelo só gravam DADOS (os rótulos), e o código só lê.
 */
import { getModuloRegistro, moduloDaRota } from "@/lib/modulos/registry";

export interface RotuloModulo {
  singular: string;
  plural: string;
}
/** `modulos.chave` → rótulo. */
export type MapaRotulos = Record<string, RotuloModulo>;
export type FormaRotulo = "singular" | "plural";

export const ROTULO_MIN = 1;
export const ROTULO_MAX = 40;

/**
 * O nome que cada módulo já tem hoje nas telas. `plural` é o título do menu e
 * da página; `singular` é o item ("Lead", "Reunião"). Rótulo igual ao padrão
 * conta como "sem rótulo" (personalizado() = false).
 */
export const ROTULOS_PADRAO: Record<string, RotuloModulo> = {
  leads: { singular: "Lead", plural: "Leads" },
  renegados: { singular: "Renegado", plural: "Renegados" },
  clientes: { singular: "Cliente", plural: "Clientes" },
  agenda: { singular: "Reunião", plural: "Agenda" },
  vendedores: { singular: "Vendedor", plural: "Vendedores" },
  financeiro: { singular: "Financeiro", plural: "Financeiro" },
  rh: { singular: "RH", plural: "RH" },
  marketing: { singular: "Marketing", plural: "Marketing" },
  juridico: { singular: "Jurídico & Contábil", plural: "Jurídico & Contábil" },
  p3d_impressoras: { singular: "Impressora", plural: "Impressoras" },
  p3d_estoque: { singular: "Material", plural: "Estoque" },
  p3d_produtos: { singular: "Produto", plural: "Produtos e catálogo" },
  p3d_precificacao: { singular: "Precificação", plural: "Precificação" },
  p3d_orcamentos: { singular: "Orçamento", plural: "Orçamentos 3D" },
  p3d_fornecedores: { singular: "Fornecedor", plural: "Fornecedores e compras" },
  p3d_pedidos: { singular: "Pedido", plural: "Pedidos e vendas" },
  p3d_producao: { singular: "Trabalho", plural: "Produção" },
  p3d_qualidade: { singular: "Inspeção", plural: "Qualidade" },
  p3d_expedicao: { singular: "Envio", plural: "Expedição" },
};

/** Primeira letra minúscula, exceto em sigla (RH, SST), para usar no meio da frase. */
export function minusculo(texto: string): string {
  if (texto.length === 0 || texto === texto.toUpperCase()) return texto;
  return texto[0].toLowerCase() + texto.slice(1);
}

function textoValido(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const t = valor.trim();
  return t.length >= ROTULO_MIN && t.length <= ROTULO_MAX ? t : null;
}

/**
 * Lê `workspace_config.config` (jsonb, não confiável) e devolve só o que é
 * rótulo bem formado de um módulo que o código conhece. Qualquer outra forma é
 * ignorada: uma configuração torta nunca derruba a tela nem apaga um nome.
 */
export function lerMapaRotulos(config: unknown): MapaRotulos {
  if (!config || typeof config !== "object") return {};
  const labels = (config as { labels?: unknown }).labels;
  if (!labels || typeof labels !== "object" || Array.isArray(labels)) return {};
  const mapa: MapaRotulos = {};
  for (const [chave, bruto] of Object.entries(labels as Record<string, unknown>)) {
    if (!getModuloRegistro(chave) || !bruto || typeof bruto !== "object") continue;
    const singular = textoValido((bruto as { singular?: unknown }).singular);
    const plural = textoValido((bruto as { plural?: unknown }).plural);
    if (singular && plural) mapa[chave] = { singular, plural };
  }
  return mapa;
}

export interface TextoRotulo {
  singular: string;
  plural: string;
  /** Para o meio da frase ("Total de pacientes"). */
  singularMin: string;
  pluralMin: string;
}

export interface Rotulos {
  mapa: MapaRotulos;
  /** Há rótulo configurado que difere do nome padrão do módulo. */
  personalizado(modulo: string): boolean;
  singular(modulo: string): string;
  plural(modulo: string): string;
  rotulo(modulo: string, forma: FormaRotulo): string;
  /**
   * Texto de tela: sem rótulo personalizado devolve `padrao` INTACTO (o texto
   * que o app já tinha); com rótulo, `com(...)`, que deve usar formulações
   * neutras em gênero ("Adicionar {singular}", "Lista de {plural}").
   */
  texto(modulo: string, padrao: string, com: (r: TextoRotulo) => string): string;
}

/** Quem não tem rótulo nenhum. */
export const SEM_ROTULOS: MapaRotulos = {};

export function criarRotulos(mapa: MapaRotulos = SEM_ROTULOS): Rotulos {
  const padrao = (modulo: string): RotuloModulo =>
    ROTULOS_PADRAO[modulo] ?? { singular: modulo, plural: modulo };
  const efetivo = (modulo: string): RotuloModulo => mapa[modulo] ?? padrao(modulo);

  const rotulos: Rotulos = {
    mapa,
    personalizado(modulo) {
      const p = mapa[modulo];
      const d = padrao(modulo);
      return !!p && (p.singular !== d.singular || p.plural !== d.plural);
    },
    singular: (modulo) => efetivo(modulo).singular,
    plural: (modulo) => efetivo(modulo).plural,
    rotulo: (modulo, forma) => efetivo(modulo)[forma],
    texto(modulo, padraoDaTela, com) {
      if (!rotulos.personalizado(modulo)) return padraoDaTela;
      const { singular, plural } = efetivo(modulo);
      return com({ singular, plural, singularMin: minusculo(singular), pluralMin: minusculo(plural) });
    },
  };
  return rotulos;
}

/** Atalho: o rótulo de um módulo, com fallback para o nome padrão. */
export function rotulo(mapa: MapaRotulos, modulo: string, forma: FormaRotulo): string {
  return criarRotulos(mapa).rotulo(modulo, forma);
}

/**
 * Nome de um item do menu. Só módulos de UM item no menu (Leads, Renegados,
 * Clientes, Agenda) são renomeados — o item é o próprio módulo; os de vários
 * itens (Financeiro, RH...) mantêm o nome de cada tela.
 */
export function labelDoItemMenu(rotulos: Rotulos, href: string, labelPadrao: string): string {
  const chave = moduloDaRota(href);
  const modulo = chave ? getModuloRegistro(chave) : undefined;
  if (!modulo || modulo.menu.length !== 1) return labelPadrao;
  return rotulos.personalizado(modulo.chave) ? rotulos.plural(modulo.chave) : labelPadrao;
}

/**
 * Mapa a gravar em salvar_rotulos: o COMPLETO (RPC substitui tudo), partindo do
 * atual e aplicando só o que o usuário editou. Edição igual ao nome padrão sem
 * rótulo gravado não cria entrada; igual ao padrão com entrada, remove-a.
 */
export function mesclarRotulos(
  atual: MapaRotulos,
  edicoes: Record<string, RotuloModulo>
): MapaRotulos {
  const resultado: MapaRotulos = { ...atual };
  for (const [modulo, e] of Object.entries(edicoes)) {
    const singular = e.singular.trim();
    const plural = e.plural.trim();
    const d = ROTULOS_PADRAO[modulo];
    if (d && singular === d.singular && plural === d.plural) delete resultado[modulo];
    else resultado[modulo] = { singular, plural };
  }
  return resultado;
}

/** Valida um rótulo editado (1 a 40 caracteres, como a RPC). Devolve a mensagem ou null. */
export function validarRotulo(r: RotuloModulo): string | null {
  for (const forma of ["singular", "plural"] as const) {
    const n = r[forma].trim().length;
    if (n < ROTULO_MIN || n > ROTULO_MAX) {
      return `Use de ${ROTULO_MIN} a ${ROTULO_MAX} caracteres no ${forma}.`;
    }
  }
  return null;
}

/**
 * Ordem para ligar módulos recomendados: dependências antes de quem depende
 * (definir_modulo valida `depende_de` a cada chamada). Ignora o que já está
 * ligado, o que não está `ativo` no catálogo e o que o código não conhece.
 */
export interface ModuloDoCatalogo {
  chave: string;
  ativo: boolean;
  dependeDe: string[];
}
export function ordemParaLigar(
  recomendados: readonly string[],
  catalogo: readonly ModuloDoCatalogo[],
  ligados: readonly string[]
): string[] {
  const porChave = new Map(catalogo.map((m) => [m.chave, m]));
  const jaLigado = new Set(ligados);
  const ordem: string[] = [];
  const visitando = new Set<string>();

  function visitar(chave: string) {
    const m = porChave.get(chave);
    if (!m || !m.ativo || !getModuloRegistro(chave)) return;
    if (jaLigado.has(chave) || ordem.includes(chave) || visitando.has(chave)) return;
    visitando.add(chave);
    for (const d of m.dependeDe) visitar(d);
    visitando.delete(chave);
    ordem.push(chave);
  }
  for (const r of recomendados) visitar(r);
  return ordem;
}
