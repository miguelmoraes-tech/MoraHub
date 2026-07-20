import * as z from "zod";

export const ServicoSchema = z.object({
  nome: z.string().min(1, { error: "Informe o nome do serviço." }),
});

export type ServicoInput = z.infer<typeof ServicoSchema>;
