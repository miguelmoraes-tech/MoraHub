import * as z from "zod";

export const FolhaPagamentoSchema = z.object({
  salario_bruto: z.coerce.number().nonnegative({ error: "Informe um salário bruto válido." }),
  descontos: z.coerce.number().nonnegative().optional(),
  salario_liquido: z.coerce.number().nonnegative({ error: "Informe um salário líquido válido." }),
  status: z.enum(["pendente", "pago"], { error: "Selecione um status válido." }),
  data_pagamento: z.string().optional(),
  observacoes: z.string().optional(),
});

export type FolhaPagamentoInput = z.infer<typeof FolhaPagamentoSchema>;
