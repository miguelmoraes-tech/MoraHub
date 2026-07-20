import * as z from "zod";

export const ComprovanteSchema = z.object({
  descricao: z.string().min(1, { error: "Informe a descrição do comprovante." }),
  valor: z.coerce
    .number({ error: "Informe um valor válido." })
    .min(0, { error: "O valor deve ser positivo." }),
  data: z.string().optional(),
  link: z.string().optional(),
});

export type ComprovanteInput = z.infer<typeof ComprovanteSchema>;
