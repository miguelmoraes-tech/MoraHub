import * as z from "zod";

export const ModeloContratoSchema = z.object({
  dono_id: z.string().min(1, { error: "Selecione a conta." }),
  titulo: z.string().min(1, { error: "Informe o título." }),
  categoria: z.string().optional(),
  conteudo: z.string().optional(),
  tags: z.string().optional(),
});

export type ModeloContratoInput = z.infer<typeof ModeloContratoSchema>;
