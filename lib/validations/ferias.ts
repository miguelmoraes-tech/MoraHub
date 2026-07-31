import * as z from "zod";

export const FeriasSchema = z.object({
  funcionario_id: z.string().min(1, { error: "Selecione o funcionário." }),
  periodo_aquisitivo_inicio: z.string().optional(),
  periodo_aquisitivo_fim: z.string().optional(),
  dias_direito: z.coerce.number().int().nonnegative().optional(),
  dias_gozados: z.coerce.number().int().nonnegative().optional(),
  data_inicio_gozo: z.string().optional(),
  data_fim_gozo: z.string().optional(),
  status: z.enum(["pendente", "agendada", "em_gozo", "concluida"], {
    error: "Selecione um status válido.",
  }),
  observacoes: z.string().optional(),
});

export type FeriasInput = z.infer<typeof FeriasSchema>;
