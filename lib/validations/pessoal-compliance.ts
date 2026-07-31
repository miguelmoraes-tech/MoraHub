import * as z from "zod";

export const PessoalComplianceSchema = z.object({
  categoria: z.enum(["LGPD", "Outro"], {
    error: "Selecione uma categoria válida.",
  }),
  status: z.enum(["pendente", "em_andamento", "conforme"], {
    error: "Selecione um status válido.",
  }),
  proxima_revisao: z.string().optional(),
  observacoes: z.string().optional(),
});

export type PessoalComplianceInput = z.infer<typeof PessoalComplianceSchema>;
