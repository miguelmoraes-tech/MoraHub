import * as z from "zod";

export const PropostaSchema = z.object({
  titulo: z.string().min(1, { error: "Informe o título." }),
  descricao: z.string().optional(),
  valor: z.coerce
    .number({ error: "Informe um valor válido." })
    .min(0, { error: "O valor deve ser positivo." })
    .optional(),
  versao: z.coerce
    .number({ error: "Informe uma versão válida." })
    .min(1, { error: "A versão deve ser pelo menos 1." }),
  status: z.enum(["enviada", "em_negociacao", "aceita", "recusada"], {
    error: "Selecione um status válido.",
  }),
  data_envio: z.string().optional(),
  data_resposta: z.string().optional(),
  observacoes: z.string().optional(),
});

export type PropostaInput = z.infer<typeof PropostaSchema>;
