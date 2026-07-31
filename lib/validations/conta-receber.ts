import * as z from "zod";

export const ContaReceberSchema = z.object({
  descricao: z.string().min(1, { error: "Informe a descrição." }),
  valor: z.coerce.number().positive({ error: "Informe um valor válido." }),
  cliente_id: z.string().optional(),
  proposta_id: z.string().optional(),
  data_vencimento: z.string().min(1, { error: "Informe o vencimento." }),
  data_recebimento: z.string().optional(),
  status: z.enum(["pendente", "recebido", "atrasado"], {
    error: "Selecione um status válido.",
  }),
  observacoes: z.string().optional(),
});

export type ContaReceberInput = z.infer<typeof ContaReceberSchema>;
