import * as z from "zod";

export const AvaliacaoDesempenhoSchema = z.object({
  funcionario_id: z.string().min(1, { error: "Selecione o funcionário." }),
  avaliador_id: z.string().optional(),
  periodo_referencia: z.string().min(1, { error: "Informe o período de referência." }),
  nota: z.coerce.number().min(0).max(10).optional(),
  pontos_fortes: z.string().optional(),
  pontos_melhoria: z.string().optional(),
  metas_proximo_periodo: z.string().optional(),
  observacoes: z.string().optional(),
});

export type AvaliacaoDesempenhoInput = z.infer<typeof AvaliacaoDesempenhoSchema>;
