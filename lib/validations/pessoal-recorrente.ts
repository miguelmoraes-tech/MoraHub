import * as z from "zod";

export const PessoalRecorrenteSchema = z.object({
  name: z.string().min(1, { error: "Informe o nome do gasto." }),
  amount: z.coerce
    .number({ error: "Informe um valor válido." })
    .positive({ error: "O valor deve ser maior que zero." }),
  due_day: z.coerce
    .number({ error: "Informe o dia de vencimento." })
    .min(1, { error: "O dia deve ser entre 1 e 31." })
    .max(31, { error: "O dia deve ser entre 1 e 31." }),
  category_id: z.string().optional(),
  account_id: z.string().optional(),
  is_active: z.coerce.boolean().optional(),
  notes: z.string().optional(),
});

export type PessoalRecorrenteInput = z.infer<typeof PessoalRecorrenteSchema>;
