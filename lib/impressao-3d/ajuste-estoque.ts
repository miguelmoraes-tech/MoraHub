/**
 * "Atualizar quantidade" e "Conferir estoque" (aba Material). Regras puras: a diferença entre o que a
 * pessoa contou e o saldo do sistema (com sinal), quais linhas mudaram, o motivo e a observação do
 * ajuste. Quem muda o saldo é o banco (p3d_movimentar_estoque, tipo "ajuste"); nada aqui calcula custo
 * nem grava estoque_atual.
 */
import { formatDataIso, hojeSaoPaulo } from "@/lib/impressao-3d/datas";
import { parseNumero } from "@/lib/impressao-3d/numeros";

export const MOTIVOS_AJUSTE = [
  { chave: "contagem", rotulo: "Contagem/inventário" },
  { chave: "uso_fora", rotulo: "Uso fora do sistema" },
  { chave: "perda", rotulo: "Perda" },
  { chave: "outro", rotulo: "Outro" },
] as const;
export type MotivoAjuste = (typeof MOTIVOS_AJUSTE)[number]["chave"];
export const MOTIVO_PADRAO: MotivoAjuste = "contagem";

export function motivoValido(v: unknown): v is MotivoAjuste {
  return MOTIVOS_AJUSTE.some((m) => m.chave === v);
}

export function rotuloMotivo(chave: MotivoAjuste): string {
  return MOTIVOS_AJUSTE.find((m) => m.chave === chave)?.rotulo ?? chave;
}

/** O saldo é numeric com 3 casas: arredonda para tirar o ruído de ponto flutuante (0,1 + 0,2). */
function arredondar(n: number): number {
  return Math.round((n + Number.EPSILON) * 1000) / 1000;
}

/** Diferença com sinal: contagem − saldo. Positivo soma ao estoque, negativo tira. */
export function diferencaContagem(saldoAtual: number, contagem: number): number {
  return arredondar(contagem - saldoAtual);
}

/** Só chama o banco quando a diferença não é zero. */
export function precisaAjustar(diferenca: number): boolean {
  return Number.isFinite(diferenca) && diferenca !== 0;
}

export type LeituraContagem = { contagem: number | null } | { error: string };

/** Texto do campo "Quanto tem agora?": vazio = não contou (null); inválido ou negativo = erro. */
export function lerContagem(texto: unknown): LeituraContagem {
  const n = parseNumero(texto);
  if (n === null) return { contagem: null };
  if (Number.isNaN(n)) return { error: "Quanto tem agora: informe um número válido." };
  if (n < 0) return { error: "Quanto tem agora: não pode ser negativo." };
  return { contagem: n };
}

export interface ItemConferencia {
  id: string;
  /** Saldo do sistema (g, ml ou un). */
  saldo: number;
  /** Texto digitado em "Quanto tem agora?" (vazio = não conferido). */
  contagem: unknown;
}

export interface AjusteCalculado {
  id: string;
  diferenca: number;
  contagem: number;
}

/**
 * Conferência em lote: devolve só as linhas que mudaram (diferença ≠ 0), com o sinal. Linha vazia ou
 * igual ao saldo é ignorada. Qualquer valor inválido interrompe tudo (nada é ajustado pela metade).
 */
export function ajustesDaConferencia(itens: readonly ItemConferencia[]): { ajustes: AjusteCalculado[] } | { error: string; id: string } {
  const ajustes: AjusteCalculado[] = [];
  for (const it of itens) {
    const lida = lerContagem(it.contagem);
    if ("error" in lida) return { error: lida.error, id: it.id };
    if (lida.contagem === null) continue;
    const diferenca = diferencaContagem(it.saldo, lida.contagem);
    if (precisaAjustar(diferenca)) ajustes.push({ id: it.id, diferenca, contagem: lida.contagem });
  }
  return { ajustes };
}

/** Observação gravada no movimento: o motivo escolhido, mais o texto livre (se houver). */
export function observacaoDoAjuste(motivo: MotivoAjuste, extra?: unknown): string {
  const texto = typeof extra === "string" ? extra.trim().replace(/\s+/g, " ") : "";
  return texto ? `${rotuloMotivo(motivo)} — ${texto}` : rotuloMotivo(motivo);
}

/** Observação padrão da conferência em lote. `hoje` existe para teste. */
export function observacaoConferencia(hoje: string = hojeSaoPaulo()): string {
  return `Conferência de estoque em ${formatDataIso(hoje)}`;
}

/** Saldo para destacar na lista: filamento (g) em gramas E quilos; demais unidades como estão. */
export function saldoParaExibir(saldo: number, unidade: string): { principal: string; secundario: string | null } {
  const n = (v: number, casas: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: casas }).format(v);
  if (unidade === "g") return { principal: `${n(saldo, 1)} g`, secundario: `${n(saldo / 1000, 3)} kg` };
  return { principal: `${n(saldo, 2)} ${unidade}`, secundario: null };
}

/** Texto da diferença para o aviso do formulário e do histórico: "+120 g" / "−50 g". */
export function textoDiferenca(diferenca: number, unidade: string): string {
  const n = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(Math.abs(diferenca));
  return `${diferenca > 0 ? "+" : diferenca < 0 ? "−" : ""}${n} ${unidade}`;
}
