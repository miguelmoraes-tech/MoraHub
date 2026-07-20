import * as z from "zod";

export const GastoClienteSchema = z.object({
  cliente_id: z.string().min(1, { error: "Selecione um cliente." }),
  descricao: z.string().min(1, { error: "Informe a descrição do gasto." }),
  valor: z.coerce
    .number({ error: "Informe um valor válido." })
    .min(0, { error: "O valor deve ser positivo." }),
  data: z.string().min(1, { error: "Informe a data." }),
});

export type GastoClienteInput = z.infer<typeof GastoClienteSchema>;
