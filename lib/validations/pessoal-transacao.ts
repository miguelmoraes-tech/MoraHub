import * as z from "zod";

export const PessoalTransacaoSchema = z.object({
  type: z.enum(["receita", "despesa"], { error: "Selecione um tipo válido." }),
  amount: z.coerce
    .number({ error: "Informe um valor válido." })
    .positive({ error: "O valor deve ser maior que zero." }),
  description: z.string().optional(),
  account_id: z.string().optional(),
  category_id: z.string().optional(),
  transaction_date: z.string().min(1, { error: "Informe a data." }),
  is_recurring: z.coerce.boolean().optional(),
});

export type PessoalTransacaoInput = z.infer<typeof PessoalTransacaoSchema>;
