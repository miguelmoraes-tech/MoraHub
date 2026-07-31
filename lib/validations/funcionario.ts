import * as z from "zod";

export const FuncionarioSchema = z.object({
  nome: z.string().min(1, { error: "Informe o nome." }),
  cargo: z.string().optional(),
  cpf: z.string().optional(),
  email: z.string().optional(),
  telefone: z.string().optional(),
  data_admissao: z.string().optional(),
  data_desligamento: z.string().optional(),
  tipo_contrato: z.enum(["clt", "pj", "estagio", "freelancer", "outro"], {
    error: "Selecione um tipo de contrato válido.",
  }),
  salario: z.coerce.number().nonnegative({ error: "Informe um salário válido." }).optional(),
  status: z.enum(["ativo", "afastado", "desligado"], {
    error: "Selecione um status válido.",
  }),
  observacoes: z.string().optional(),
  departamento_id: z.string().optional(),
  gestor_id: z.string().optional(),
});

export type FuncionarioInput = z.infer<typeof FuncionarioSchema>;
