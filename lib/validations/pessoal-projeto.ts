import * as z from "zod";

export const PessoalProjetoSchema = z.object({
  name: z.string().min(1, { error: "Informe o nome do projeto." }),
  status: z.enum(
    ["planejamento", "em_andamento", "pausado", "concluido", "arquivado"],
    { error: "Selecione um status válido." }
  ),
});

export type PessoalProjetoInput = z.infer<typeof PessoalProjetoSchema>;
