import * as z from "zod";

export const GastoFixoSchema = z.object({
  nome: z.string().min(1, { error: "Informe o nome do gasto." }),
  valor: z.coerce
    .number({ error: "Informe um valor válido." })
    .min(0, { error: "O valor deve ser positivo." }),
  recorrencia: z.enum(["Mensal", "Anual", "Único"], {
    error: "Selecione uma recorrência válida.",
  }),
  data: z.string().min(1, { error: "Informe a data." }),
});

export type GastoFixoInput = z.infer<typeof GastoFixoSchema>;
