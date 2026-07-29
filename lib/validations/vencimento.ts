import * as z from "zod";

export const VencimentoSchema = z.object({
  titulo: z.string().min(1, { error: "Informe o título." }),
  data: z.string().min(1, { error: "Informe a data." }),
  nota: z.string().optional(),
});

export type VencimentoInput = z.infer<typeof VencimentoSchema>;
