import * as z from "zod";

export const DocumentoSchema = z.object({
  titulo: z.string().min(1, { error: "Informe o título." }),
  tipo: z.enum(["link", "nota"], { error: "Selecione um tipo válido." }),
  categoria: z
    .enum([
      "Contrato",
      "Proposta",
      "Briefing",
      "Nota fiscal",
      "Arquivo do cliente",
      "Outro",
    ])
    .optional(),
  cliente_id: z.string().optional(),
  conteudo: z.string().optional(),
  data: z.string().optional(),
});

export type DocumentoInput = z.infer<typeof DocumentoSchema>;
