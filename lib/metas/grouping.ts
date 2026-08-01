import type { MetaOkr } from "@/lib/types";

export interface ObjetivoAgrupado {
  objetivo: MetaOkr;
  resultados: MetaOkr[];
  /** Média do progresso (0-100) dos Resultados-Chave com valor_meta > 0; null se nenhum. */
  progressoMedio: number | null;
  /**
   * Atraso é sempre derivado (periodo_fim já passou e o objetivo não foi
   * concluído/cancelado), nunca lido de `status` diretamente — o valor salvo
   * em `status` é definido manualmente pelo usuário (mesmo padrão do resto
   * do app: nenhum outro módulo tem um job/trigger que reescreve status
   * automaticamente). Isso evita que um objetivo fique com o rótulo
   * "atrasado" congelado mesmo depois que o usuário estende o prazo, e
   * também sinaliza atraso mesmo que o usuário tenha esquecido de marcar o
   * status manualmente.
   */
  atrasado: boolean;
}

/** Progresso (0-100) de um Resultado-Chave: valor_atual ÷ valor_meta. */
export function calcularProgresso(item: Pick<MetaOkr, "valor_atual" | "valor_meta">): number {
  if (!item.valor_meta || item.valor_meta <= 0) return 0;
  return Math.min(100, Math.max(0, (item.valor_atual / item.valor_meta) * 100));
}

function estaAtrasado(objetivo: MetaOkr, hojeISO: string): boolean {
  if (objetivo.status === "concluido" || objetivo.status === "cancelado") return false;
  if (objetivo.status === "atrasado") return true;
  return !!objetivo.periodo_fim && objetivo.periodo_fim < hojeISO;
}

/** Agrupa objetivos com seus Resultados-Chave (via parent_okr_id) e deriva progresso/atraso. */
export function agruparObjetivos(itens: MetaOkr[], hojeISO: string): ObjetivoAgrupado[] {
  const resultadosPorObjetivo = new Map<string, MetaOkr[]>();
  for (const item of itens) {
    if (item.tipo !== "resultado_chave" || !item.parent_okr_id) continue;
    const lista = resultadosPorObjetivo.get(item.parent_okr_id) ?? [];
    lista.push(item);
    resultadosPorObjetivo.set(item.parent_okr_id, lista);
  }

  return itens
    .filter((item) => item.tipo === "objetivo")
    .map((objetivo) => {
      const resultados = resultadosPorObjetivo.get(objetivo.id) ?? [];
      const progressos = resultados
        .filter((r) => r.valor_meta !== null && r.valor_meta > 0)
        .map((r) => calcularProgresso(r));
      const progressoMedio =
        progressos.length > 0
          ? progressos.reduce((a, b) => a + b, 0) / progressos.length
          : null;

      return {
        objetivo,
        resultados,
        progressoMedio,
        atrasado: estaAtrasado(objetivo, hojeISO),
      };
    });
}

/** Se o período do objetivo (quando definido) inclui a data de hoje. */
export function periodoAtualInclui(objetivo: Pick<MetaOkr, "periodo_inicio" | "periodo_fim">, hojeISO: string) {
  if (objetivo.periodo_inicio && objetivo.periodo_inicio > hojeISO) return false;
  if (objetivo.periodo_fim && objetivo.periodo_fim < hojeISO) return false;
  return true;
}
