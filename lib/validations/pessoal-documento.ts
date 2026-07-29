import * as z from "zod";

export const PessoalDocumentoSchema = z.object({
  name: z.string().min(1, { error: "Informe o nome do documento." }),
  category: z.enum(
    ["pessoal", "fiscal", "contrato", "saude", "educacao", "outro"],
    { error: "Selecione uma categoria válida." }
  ),
  expires_at: z.string().optional(),
  tags: z.string().optional(),
  notes: z.string().optional(),
});

export type PessoalDocumentoInput = z.infer<typeof PessoalDocumentoSchema>;
