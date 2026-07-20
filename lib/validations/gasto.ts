import * as z from "zod";

export const GastoSchema = z.object({
  nome: z.string().min(1, { error: "Informe o nome do gasto." }),
  valor: z.coerce
    .number({ error: "Informe um valor válido." })
    .min(0, { error: "O valor deve ser positivo." }),
  tipo: z.enum(["fixo", "pontual"], {
    error: "Selecione um tipo válido.",
  }),
  recorrencia: z.enum(["Mensal", "Anual", "Único"]).optional(),
  cliente_id: z.string().optional(),
  data: z.string().min(1, { error: "Informe a data." }),
});

export type GastoInput = z.infer<typeof GastoSchema>;
