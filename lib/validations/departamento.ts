import * as z from "zod";

export const DepartamentoSchema = z.object({
  nome: z.string().min(1, { error: "Informe o nome do departamento." }),
  descricao: z.string().optional(),
  gestor_funcionario_id: z.string().optional(),
});

export type DepartamentoInput = z.infer<typeof DepartamentoSchema>;
