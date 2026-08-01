import * as z from "zod";

export const CampanhaSchema = z.object({
  nome: z.string().min(1, { error: "Informe o nome da campanha." }),
  canal: z.enum(
    ["meta_ads", "google_ads", "linkedin_ads", "tiktok_ads", "organico", "outro"],
    { error: "Selecione o canal." }
  ),
  status: z.enum(["planejada", "ativa", "pausada", "encerrada"], {
    error: "Selecione o status.",
  }),
  data_inicio: z.string().optional(),
  data_fim: z.string().optional(),
  orcamento_planejado: z.coerce
    .number({ error: "Informe um orçamento válido." })
    .min(0, { error: "O orçamento deve ser positivo." })
    .optional(),
  valor_gasto: z.coerce
    .number({ error: "Informe um valor gasto válido." })
    .min(0, { error: "O valor gasto deve ser positivo." })
    .optional(),
  cliques: z.coerce
    .number({ error: "Informe um número de cliques válido." })
    .int()
    .min(0, { error: "Os cliques devem ser positivos." })
    .optional(),
  impressoes: z.coerce
    .number({ error: "Informe um número de impressões válido." })
    .int()
    .min(0, { error: "As impressões devem ser positivas." })
    .optional(),
  observacoes: z.string().optional(),
});

export type CampanhaInput = z.infer<typeof CampanhaSchema>;
