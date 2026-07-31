import * as z from "zod";

export const ControlePontoSchema = z.object({
  funcionario_id: z.string().min(1, { error: "Selecione o funcionário." }),
  data: z.string().min(1, { error: "Informe a data." }),
  entrada: z.string().optional(),
  saida_almoco: z.string().optional(),
  volta_almoco: z.string().optional(),
  saida: z.string().optional(),
  horas_trabalhadas: z.coerce.number().nonnegative().optional(),
  status: z.enum(
    ["normal", "falta", "falta_justificada", "feriado", "ferias", "atestado"],
    { error: "Selecione um status válido." }
  ),
  observacoes: z.string().optional(),
});

export type ControlePontoInput = z.infer<typeof ControlePontoSchema>;
