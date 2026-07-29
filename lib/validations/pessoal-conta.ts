import * as z from "zod";

export const PessoalContaSchema = z.object({
  name: z.string().min(1, { error: "Informe o nome da conta." }),
  type: z.enum(
    ["corrente", "poupanca", "cartao", "carteira", "investimento", "outro"],
    { error: "Selecione um tipo válido." }
  ),
  balance: z.coerce.number({ error: "Informe um saldo válido." }),
});

export type PessoalContaInput = z.infer<typeof PessoalContaSchema>;
