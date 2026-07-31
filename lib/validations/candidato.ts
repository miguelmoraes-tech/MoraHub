import * as z from "zod";

export const CandidatoSchema = z.object({
  vaga_id: z.string().min(1, { error: "Selecione a vaga." }),
  nome: z.string().min(1, { error: "Informe o nome do candidato." }),
  email: z.string().optional(),
  telefone: z.string().optional(),
  status: z.enum(
    ["triagem", "entrevista", "teste", "aprovado", "reprovado", "contratado"],
    { error: "Selecione um status válido." }
  ),
  origem: z.string().optional(),
  observacoes: z.string().optional(),
});

export type CandidatoInput = z.infer<typeof CandidatoSchema>;
