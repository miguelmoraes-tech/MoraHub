export interface RentabilidadeResumo {
  receita: number;
  custo: number;
  lucro: number;
  /** lucro / receita, or null when there's no receita to divide by. */
  margem: number | null;
}

export function calcularRentabilidade(
  receita: number,
  custo: number
): RentabilidadeResumo {
  const lucro = receita - custo;
  return {
    receita,
    custo,
    lucro,
    margem: receita > 0 ? lucro / receita : null,
  };
}

export interface RentabilidadeCliente extends RentabilidadeResumo {
  clienteId: string;
  clienteNome: string;
}

/**
 * Ranks clients by lucro (receita de comprovantes − custo de gastos
 * atribuídos ao cliente). Clients with no comprovante and no gasto are
 * dropped — there's nothing to rank.
 */
export function rankearClientesPorRentabilidade(
  clientes: { id: string; nome: string }[],
  comprovantes: { cliente_id: string; valor: number }[],
  gastos: { cliente_id: string | null; valor: number }[]
): RentabilidadeCliente[] {
  const receitaPorCliente = new Map<string, number>();
  for (const comprovante of comprovantes) {
    receitaPorCliente.set(
      comprovante.cliente_id,
      (receitaPorCliente.get(comprovante.cliente_id) ?? 0) + comprovante.valor
    );
  }

  const custoPorCliente = new Map<string, number>();
  for (const gasto of gastos) {
    if (!gasto.cliente_id) continue;
    custoPorCliente.set(
      gasto.cliente_id,
      (custoPorCliente.get(gasto.cliente_id) ?? 0) + gasto.valor
    );
  }

  return clientes
    .map((cliente) => {
      const receita = receitaPorCliente.get(cliente.id) ?? 0;
      const custo = custoPorCliente.get(cliente.id) ?? 0;
      return {
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        ...calcularRentabilidade(receita, custo),
      };
    })
    .filter((r) => r.receita > 0 || r.custo > 0)
    .sort((a, b) => b.lucro - a.lucro);
}

/** Sums gasto.valor grouped by projeto_id — gastos without a projeto_id are excluded. */
export function custoPorProjeto(
  gastos: { projeto_id: string | null; valor: number }[]
): Map<string, number> {
  const map = new Map<string, number>();
  for (const gasto of gastos) {
    if (!gasto.projeto_id) continue;
    map.set(gasto.projeto_id, (map.get(gasto.projeto_id) ?? 0) + gasto.valor);
  }
  return map;
}
