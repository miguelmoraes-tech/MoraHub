import * as z from "zod";

export const ReuniaoCanalSchema = z.enum(
  ["presencial", "video", "telefone", "whatsapp"],
  { error: "Selecione o canal." }
);

export const ReuniaoStatusSchema = z.enum(
  ["agendada", "realizada", "cancelada", "nao_compareceu"],
  { error: "Status inválido." }
);

const dataHoraSchema = z.iso.datetime({ error: "Informe a data e a hora da reunião." });

export const AgendarReuniaoSchema = z.object({
  data_hora: dataHoraSchema,
  duracao_min: z.coerce
    .number({ error: "Informe a duração." })
    .int({ error: "A duração deve ser em minutos inteiros." })
    .min(5, { error: "A duração mínima é de 5 minutos." })
    .max(480, { error: "A duração máxima é de 8 horas." }),
  canal: ReuniaoCanalSchema,
  local_link: z.string().max(500, { error: "Link/local muito longo." }).optional(),
  observacoes: z.string().max(2000, { error: "Observações muito longas." }).optional(),
});

export type AgendarReuniaoInput = z.infer<typeof AgendarReuniaoSchema>;

export const AtualizarReuniaoSchema = z.object({
  data_hora: dataHoraSchema.optional(),
  status: ReuniaoStatusSchema.optional(),
  observacoes: z.string().max(2000, { error: "Observações muito longas." }).optional(),
});

export type AtualizarReuniaoInput = z.infer<typeof AtualizarReuniaoSchema>;
