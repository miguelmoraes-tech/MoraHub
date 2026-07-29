import * as z from "zod";

export const PessoalTarefaSchema = z.object({
  title: z.string().min(1, { error: "Informe o título da tarefa." }),
  description: z.string().optional(),
  due_date: z.string().optional(),
  priority: z.enum(["baixa", "media", "alta"], {
    error: "Selecione uma prioridade válida.",
  }),
  project_id: z.string().optional(),
});

export type PessoalTarefaInput = z.infer<typeof PessoalTarefaSchema>;
