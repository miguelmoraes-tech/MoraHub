import * as z from "zod";

export const VagaSchema = z.object({
  titulo: z.string().min(1, { error: "Informe o título da vaga." }),
  departamento_id: z.string().optional(),
  status: z.enum(["aberta", "pausada", "fechada"], {
    error: "Selecione um status válido.",
  }),
  descricao: z.string().optional(),
  requisitos: z.string().optional(),
  salario_previsto: z.coerce.number().nonnegative().optional(),
  tipo_contrato: z.enum(["clt", "pj", "estagio", "freelancer", "outro"], {
    error: "Selecione um tipo de contrato válido.",
  }),
});

export type VagaInput = z.infer<typeof VagaSchema>;
