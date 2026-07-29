import * as z from "zod";

export const PessoalInvestimentoSchema = z.object({
  name: z.string().min(1, { error: "Informe o nome do investimento." }),
  investment_type: z.enum(
    [
      "renda_fixa",
      "tesouro_direto",
      "acoes",
      "fundos",
      "cripto",
      "previdencia",
      "outro",
    ],
    { error: "Selecione um tipo válido." }
  ),
  invested_amount: z.coerce
    .number({ error: "Informe o valor investido." })
    .min(0, { error: "O valor deve ser positivo." }),
  current_value: z.coerce.number().optional(),
  account_id: z.string().optional(),
  broker: z.string().optional(),
  purchase_date: z.string().optional(),
  notes: z.string().optional(),
});

export type PessoalInvestimentoInput = z.infer<typeof PessoalInvestimentoSchema>;
