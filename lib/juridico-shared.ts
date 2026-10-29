import type { Cliente } from "@/lib/types";

/** Cliente como as telas do Jurídico o enxergam: só id e nome (leitura auxiliar). */
export type ClienteBasico = Pick<Cliente, "id" | "nome">;

/**
 * Regra de escrita do Jurídico (pura, testável). Processos, compliance e
 * propriedade intelectual são por cliente: precisam de Clientes (lista no
 * formulário, nomes na tela). Modelos de contrato só dependem do nível.
 */
export function permissoesJuridico(
  nivel: "leitura" | "edicao",
  temClientes: boolean
): { somenteLeitura: boolean; somenteLeituraPorCliente: boolean } {
  const semEdicao = nivel !== "edicao";
  return { somenteLeitura: semEdicao, somenteLeituraPorCliente: semEdicao || !temClientes };
}
