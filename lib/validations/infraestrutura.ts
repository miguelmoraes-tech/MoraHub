import * as z from "zod";

export const InfraestruturaSchema = z.object({
  dominio: z.string().min(1, { error: "Informe o domínio." }),
  hospedagem: z.string().optional(),
  servidor: z.string().optional(),
  dns: z.string().optional(),
  ssl: z.string().optional(),
  cdn: z.string().optional(),
  contas_email: z.string().optional(),
  tecnologias: z.string().optional(),
  data_renovacao: z.string().optional(),
  observacoes: z.string().optional(),
});

export type InfraestruturaInput = z.infer<typeof InfraestruturaSchema>;
