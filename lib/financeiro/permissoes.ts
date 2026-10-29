import type { NivelPermissao } from "@/lib/modulos/permissoes";

/**
 * Regra do Financeiro por pessoa (pura, testável). `valores` é o extra "Ver
 * valores" (fundador/cofundador sempre têm). Sem ele a tela não mostra valores
 * nem saldos e também não deixa criar/editar: não se edita o que não se vê.
 */
export function permissoesFinanceiro(acesso: {
  ehDono: boolean;
  nivel: NivelPermissao;
  extras: readonly string[];
}): { valores: boolean; somenteLeitura: boolean } {
  const valores = acesso.ehDono || acesso.extras.includes("valores");
  return { valores, somenteLeitura: acesso.nivel !== "edicao" || !valores };
}
