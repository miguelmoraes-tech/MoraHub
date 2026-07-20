import * as z from "zod";

export const ProjetoSchema = z.object({
  nome: z.string().min(1, { error: "Informe o nome do projeto." }),
  tipo: z.string().optional(),
  status: z.enum(["planejado", "em_andamento", "concluido", "pausado"], {
    error: "Selecione um status válido.",
  }),
  escopo: z.string().optional(),
  tecnologias: z.string().optional(),
  links: z.string().optional(),
  repositorio_git: z.string().optional(),
  deploy_url: z.string().optional(),
  documentacao_link: z.string().optional(),
  observacoes: z.string().optional(),
});

export type ProjetoInput = z.infer<typeof ProjetoSchema>;
