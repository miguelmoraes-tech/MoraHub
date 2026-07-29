import * as z from "zod";

export const PessoalCategoriaSchema = z.object({
  name: z.string().min(1, { error: "Informe o nome da categoria." }),
  kind: z.enum(["receita", "despesa"], { error: "Selecione um tipo válido." }),
  color: z.string().min(1, { error: "Selecione uma cor." }),
});

export type PessoalCategoriaInput = z.infer<typeof PessoalCategoriaSchema>;
