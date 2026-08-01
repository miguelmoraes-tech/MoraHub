export interface DreCategoria {
  categoria: string;
  valor: number;
}

export interface DreResultado {
  receita: number;
  despesas: DreCategoria[];
  totalDespesas: number;
  resultado: number;
  margem: number | null;
}

export function computeDre(
  gastos: { categoria: string | null; valor: number }[],
  comprovantes: { valor: number }[]
): DreResultado {
  const receita = comprovantes.reduce((acc, c) => acc + c.valor, 0);

  const porCategoria = new Map<string, number>();
  for (const gasto of gastos) {
    const chave = gasto.categoria?.trim() || "Outros";
    porCategoria.set(chave, (porCategoria.get(chave) ?? 0) + gasto.valor);
  }

  const despesas = [...porCategoria.entries()]
    .map(([categoria, valor]) => ({ categoria, valor }))
    .sort((a, b) => b.valor - a.valor);

  const totalDespesas = despesas.reduce((acc, d) => acc + d.valor, 0);
  const resultado = receita - totalDespesas;
  const margem = receita > 0 ? (resultado / receita) * 100 : null;

  return { receita, despesas, totalDespesas, resultado, margem };
}
