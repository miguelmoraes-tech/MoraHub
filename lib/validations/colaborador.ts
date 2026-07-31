import * as z from "zod";

export const ConviteSchema = z.object({
  email: z.email({ error: "Informe um e-mail válido." }),
  papel: z.enum(["contador", "advogado", "financeiro", "rh"], {
    error: "Selecione o papel do colaborador.",
  }),
});

export type ConviteInput = z.infer<typeof ConviteSchema>;
