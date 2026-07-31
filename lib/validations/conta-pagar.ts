import * as z from "zod";

export const ContaPagarSchema = z.object({
  descricao: z.string().min(1, { error: "Informe a descrição." }),
  valor: z.coerce.number().positive({ error: "Informe um valor válido." }),
  fornecedor: z.string().optional(),
  categoria: z.string().optional(),
  data_vencimento: z.string().min(1, { error: "Informe o vencimento." }),
  data_pagamento: z.string().optional(),
  status: z.enum(["pendente", "pago", "atrasado"], {
    error: "Selecione um status válido.",
  }),
  observacoes: z.string().optional(),
});

export type ContaPagarInput = z.infer<typeof ContaPagarSchema>;
