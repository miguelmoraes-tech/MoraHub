import * as z from "zod";

export const JuridicoSchema = z.object({
  titulo: z.string().min(1, { error: "Informe o título." }),
  tipo: z.enum(["Fiscal", "Jurídico", "Contábil"], {
    error: "Selecione um tipo válido.",
  }),
  prazo: z.string().optional(),
  status: z.enum(["pendente", "concluida"], {
    error: "Selecione um status válido.",
  }),
  nota: z.string().optional(),
});

export type JuridicoInput = z.infer<typeof JuridicoSchema>;
