import * as z from "zod";

export const ContratoSchema = z.object({
  descricao: z.string().min(1, { error: "Informe a descrição do contrato." }),
  valor: z.coerce
    .number({ error: "Informe um valor válido." })
    .min(0, { error: "O valor deve ser positivo." }),
  data: z.string().optional(),
  vencimento: z.string().optional(),
  link: z.string().optional(),
});

export type ContratoInput = z.infer<typeof ContratoSchema>;
