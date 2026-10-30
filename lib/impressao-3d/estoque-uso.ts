/**
 * Estoque → Material, visão de quem usa o app: o destaque é o PREÇO PAGO (não o peso), kits com partes
 * ("9 de 12 disponíveis"), conferência com saída, e o resumo do que foi investido. Regras puras: valores
 * em reais vêm do banco (view p3d_materiais_resumo e RPC p3d_resumo_investimento); aqui só se escolhe o
 * texto, se conta o que está disponível e se ordena. Nada calcula preço, saldo nem custo.
 */
import { lerGastosPorComprador, type LinhaGastosComprador } from "@/lib/impressao-3d/comprador";
import { formatDataIso } from "@/lib/impressao-3d/datas";
import { formatMoeda } from "@/lib/impressao-3d/numeros";
import { num, numOuNull } from "@/lib/impressao-3d/painel";

// --- Kits ----------------------------------------------------------------------------------------

export const KIT_ITENS_MAX = 500;

export type ConfigKit = { kit: false; kit_itens: null } | { kit: true; kit_itens: number };

/** "É um kit/conjunto": exige um número inteiro de peças/cores > 0 e a unidade vira 'un' (o banco recusa outra). */
export function validarKit(entrada: { kit: unknown; kitItens: unknown }): ConfigKit | { error: string } {
  const ligado = entrada.kit === true || entrada.kit === "on" || entrada.kit === "true";
  if (!ligado) return { kit: false, kit_itens: null };
  const bruto = typeof entrada.kitItens === "string" ? entrada.kitItens.trim() : entrada.kitItens;
  const n = typeof bruto === "number" ? bruto : Number(bruto);
  if (bruto === "" || bruto === null || bruto === undefined || !Number.isInteger(n) || n <= 0) {
    return { error: "Quantas peças/cores tem no kit: informe um número inteiro maior que zero." };
  }
  if (n > KIT_ITENS_MAX) return { error: `Quantas peças/cores tem no kit: no máximo ${KIT_ITENS_MAX}.` };
  return { kit: true, kit_itens: n };
}

export interface ParteKit {
  id: string;
  nome: string;
  disponivel: boolean;
  acabou_em?: string | null;
}

export function contagemPartes(partes: readonly Pick<ParteKit, "disponivel">[]): { disponiveis: number; total: number } {
  return { disponiveis: partes.filter((p) => p.disponivel).length, total: partes.length };
}

/** "9 de 12 disponíveis". Sem partes cadastradas, mostra o tamanho do kit: "kit de 12 peças". */
export function textoDisponiveis(partes: readonly Pick<ParteKit, "disponivel">[], kitItens: number | null): string {
  const { disponiveis, total } = contagemPartes(partes);
  if (total === 0) return kitItens ? `kit de ${kitItens} peças` : "kit sem partes cadastradas";
  return `${disponiveis} de ${total} disponíveis`;
}

/** Todas as partes acabaram (e existe ao menos uma): sugere "Marcar kit como zerado". */
export function todasAcabaram(partes: readonly Pick<ParteKit, "disponivel">[]): boolean {
  return partes.length > 0 && partes.every((p) => !p.disponivel);
}

/** Observação do ajuste de -1 que zera o kit. */
export const OBSERVACAO_KIT_ACABOU = "Kit acabou";
/** O ajuste que zera o kit tira um kit do saldo. */
export const AJUSTE_KIT_ACABOU = -1;

/** Texto do "Acabou em dd/mm/aaaa" de uma parte. */
export function textoAcabouEm(parte: Pick<ParteKit, "disponivel" | "acabou_em">): string | null {
  if (parte.disponivel) return null;
  return parte.acabou_em ? `Acabou em ${formatDataIso(parte.acabou_em)}` : "Acabou";
}

// --- Preço pago (destaque) -----------------------------------------------------------------------

/** "Pago R$ 29,00". Sem entradas com valor, o banco devolve 0 ou nada: "Sem compra registrada". */
export function textoPago(totalInvestido: number | null | undefined): string {
  return totalInvestido != null && totalInvestido > 0 ? `Pago ${formatMoeda(totalInvestido)}` : "Sem compra registrada";
}

/** "R$ 79,90/kg": o custo médio por grama do banco × 1000; sem custo médio, o do cadastro. Só filamento (g). */
export function textoPrecoKg(custoMedioPorG: number | null | undefined, custoCadastroPorG: number | null | undefined): string | null {
  const g = custoMedioPorG != null && custoMedioPorG > 0 ? custoMedioPorG : custoCadastroPorG != null && custoCadastroPorG > 0 ? custoCadastroPorG : null;
  return g === null ? null : `${formatMoeda(g * 1000)}/kg`;
}

/** Saldo curto e secundário: "1 kg em estoque", "480 g em estoque", "12 un em estoque". */
export function saldoCurto(saldo: number, unidade: string): string {
  const n = (v: number, casas: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: casas }).format(v);
  if (unidade === "g") return Math.abs(saldo) >= 1000 ? `${n(saldo / 1000, 3)} kg em estoque` : `${n(saldo, 1)} g em estoque`;
  return `${n(saldo, 2)} ${unidade} em estoque`;
}

/** Saldo de kit: "1 kit em estoque", "3 kits em estoque". */
export function saldoCurtoKit(saldo: number): string {
  const n = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(saldo);
  return `${n} ${saldo === 1 ? "kit" : "kits"} em estoque`;
}

/** total_investido por material (view p3d_materiais_resumo). */
export function lerResumosMateriais(bruto: unknown): Map<string, { total: number; compras: number }> {
  const mapa = new Map<string, { total: number; compras: number }>();
  if (!Array.isArray(bruto)) return mapa;
  for (const x of bruto) {
    if (!x || typeof x !== "object") continue;
    const l = x as Record<string, unknown>;
    if (typeof l.material_id !== "string") continue;
    mapa.set(l.material_id, { total: num(l.total_investido), compras: num(l.compras) });
  }
  return mapa;
}

// --- Ordenação -----------------------------------------------------------------------------------

export type CriterioOrdem = "nome" | "valor_pago";

export function criterioOrdemValido(v: unknown): CriterioOrdem {
  return v === "valor_pago" ? "valor_pago" : "nome";
}

/** Por nome (padrão) ou por valor pago (maior primeiro; sem valor por último; empate pelo nome). */
export function ordenarMateriais<T extends { id: string; nome: string }>(
  itens: readonly T[],
  criterio: CriterioOrdem,
  totalPorId: ReadonlyMap<string, { total: number }>
): T[] {
  const porNome = (a: T, b: T) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" });
  const copia = [...itens];
  if (criterio === "nome") return copia.sort(porNome);
  return copia.sort((a, b) => {
    const va = totalPorId.get(a.id)?.total ?? -1;
    const vb = totalPorId.get(b.id)?.total ?? -1;
    return vb - va || porNome(a, b);
  });
}

// --- Conferência ---------------------------------------------------------------------------------

/** Partes cujo "disponível" mudou em relação ao que veio do servidor. */
export function partesAlteradas(
  iniciais: readonly Pick<ParteKit, "id" | "disponivel">[],
  atuais: Readonly<Record<string, boolean>>
): { id: string; disponivel: boolean }[] {
  return iniciais
    .filter((p) => p.id in atuais && atuais[p.id] !== p.disponivel)
    .map((p) => ({ id: p.id, disponivel: atuais[p.id] }));
}

/** "3 itens atualizados": conta cada item uma vez, mesmo com ajuste E partes marcadas. */
export function resumoConferencia(idsAjustados: readonly string[], idsComPartesAlteradas: readonly string[]): string {
  const n = new Set([...idsAjustados, ...idsComPartesAlteradas]).size;
  if (n === 0) return "Nenhuma alteração.";
  return n === 1 ? "1 item atualizado." : `${n} itens atualizados.`;
}

// --- Resumo do investimento (p3d_resumo_investimento) --------------------------------------------

export interface ResumoInvestimento {
  total_investido: number;
  materiais: number;
  equipamentos: number;
  valor_em_estoque: number;
  por_comprador: LinhaGastosComprador[];
}

/** Lê o JSON do banco; formato inesperado = null (a tela não mostra número inventado). */
export function lerResumoInvestimento(bruto: unknown): ResumoInvestimento | null {
  if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) return null;
  const r = bruto as Record<string, unknown>;
  const total = numOuNull(r.total_investido);
  if (total === null) return null;
  return {
    total_investido: total,
    materiais: num(r.materiais),
    equipamentos: num(r.equipamentos),
    valor_em_estoque: num(r.valor_em_estoque),
    por_comprador: lerGastosPorComprador(r.por_comprador),
  };
}
