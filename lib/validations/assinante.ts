import * as z from "zod";

export const AssinanteSchema = z.object({
  cliente_id: z.string().min(1, { error: "Selecione um cliente." }),
  plano: z.string().min(1, { error: "Informe o nome do plano." }),
  valor: z.coerce
    .number({ error: "Informe um valor válido." })
    .min(0, { error: "O valor deve ser positivo." })
    .optional(),
  recorrencia: z.enum(["Mensal", "Anual", "Único"], {
    error: "Selecione uma recorrência válida.",
  }),
  data_inicio: z.string().optional(),
  proxima_cobranca: z.string().optional(),
  status: z.enum(["ativa", "pausada", "cancelada"], {
    error: "Selecione um status válido.",
  }),
});

export type AssinanteInput = z.infer<typeof AssinanteSchema>;
