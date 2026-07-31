import * as z from "zod";

export const OrcamentoSchema = z.object({
  categoria: z.string().min(1, { error: "Informe a categoria." }),
  mes_referencia: z.string().min(1, { error: "Informe o mês de referência." }),
  valor_planejado: z.coerce
    .number()
    .positive({ error: "Informe um valor válido." }),
  observacoes: z.string().optional(),
});

export type OrcamentoInput = z.infer<typeof OrcamentoSchema>;
