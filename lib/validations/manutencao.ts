import * as z from "zod";

export const ManutencaoSchema = z.object({
  projeto_id: z.string().optional(),
  data: z.string().min(1, { error: "Informe a data." }),
  responsavel: z.string().optional(),
  tempo_gasto: z.string().optional(),
  descricao: z.string().min(1, { error: "Informe a descrição." }),
  observacoes: z.string().optional(),
});

export type ManutencaoInput = z.infer<typeof ManutencaoSchema>;
