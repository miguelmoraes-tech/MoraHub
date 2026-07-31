import * as z from "zod";

export const ComplianceJuridicoSchema = z.object({
  cliente_id: z.string().min(1, { error: "Selecione o cliente." }),
  categoria: z.enum(["LGPD", "Alvará", "Licença", "Outro"], {
    error: "Selecione uma categoria válida.",
  }),
  status: z.enum(["pendente", "em_andamento", "conforme"], {
    error: "Selecione um status válido.",
  }),
  proxima_revisao: z.string().optional(),
  observacoes: z.string().optional(),
});

export type ComplianceJuridicoInput = z.infer<typeof ComplianceJuridicoSchema>;
