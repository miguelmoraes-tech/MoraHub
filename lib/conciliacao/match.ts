import type { Comprovante, Gasto, LancamentoExtrato } from "@/lib/types";

export interface SugestaoMatch {
  tipo: "gasto" | "comprovante";
  id: string;
  label: string;
  valor: number;
  data: string;
}

const JANELA_DIAS = 3;
const TOLERANCIA_VALOR = 0.01;

function diffDias(a: string, b: string) {
  const da = new Date(`${a}T00:00:00Z`).getTime();
  const db = new Date(`${b}T00:00:00Z`).getTime();
  return Math.abs(Math.round((da - db) / 86_400_000));
}

/**
 * Para cada lançamento pendente, sugere o melhor candidato (mesmo valor,
 * data ±3 dias) entre gastos (débito) ou comprovantes (crédito) que ainda
 * não estejam vinculados a nenhum outro lançamento — nem persistido (via
 * gasto_id/comprovante_id de outro lançamento já conciliado) nem sugerido
 * nesta mesma rodada (`usados`), pra não sugerir o mesmo registro duas
 * vezes. Em empate, vence o candidato com data mais próxima.
 */
export function sugerirMatches(
  lancamentos: LancamentoExtrato[],
  gastos: Gasto[],
  comprovantes: Comprovante[]
): Map<string, SugestaoMatch> {
  const gastosVinculados = new Set(
    lancamentos.filter((l) => l.gasto_id).map((l) => l.gasto_id as string)
  );
  const comprovantesVinculados = new Set(
    lancamentos.filter((l) => l.comprovante_id).map((l) => l.comprovante_id as string)
  );

  const gastosDisponiveis = gastos.filter((g) => !gastosVinculados.has(g.id));
  const comprovantesDisponiveis = comprovantes.filter(
    (c) => !comprovantesVinculados.has(c.id)
  );

  const usados = new Set<string>();
  const sugestoes = new Map<string, SugestaoMatch>();

  for (const lancamento of lancamentos) {
    if (lancamento.status_conciliacao !== "pendente") continue;

    const tipoCandidato = lancamento.tipo === "debito" ? "gasto" : "comprovante";
    const candidatos: (Gasto | Comprovante)[] =
      tipoCandidato === "gasto" ? gastosDisponiveis : comprovantesDisponiveis;

    let melhor: (SugestaoMatch & { dias: number }) | null = null;

    for (const candidato of candidatos) {
      const chave = `${tipoCandidato}:${candidato.id}`;
      if (usados.has(chave)) continue;
      if (!candidato.data) continue;
      if (Math.abs(candidato.valor - lancamento.valor) > TOLERANCIA_VALOR) continue;

      const dias = diffDias(candidato.data, lancamento.data);
      if (dias > JANELA_DIAS) continue;

      if (!melhor || dias < melhor.dias) {
        melhor = {
          tipo: tipoCandidato,
          id: candidato.id,
          label: tipoCandidato === "gasto" ? (candidato as Gasto).nome : (candidato as Comprovante).descricao,
          valor: candidato.valor,
          data: candidato.data,
          dias,
        };
      }
    }

    if (melhor) {
      usados.add(`${melhor.tipo}:${melhor.id}`);
      sugestoes.set(lancamento.id, {
        tipo: melhor.tipo,
        id: melhor.id,
        label: melhor.label,
        valor: melhor.valor,
        data: melhor.data,
      });
    }
  }

  return sugestoes;
}
