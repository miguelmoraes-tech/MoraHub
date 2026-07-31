import * as z from "zod";

export const BeneficioSchema = z.object({
  funcionario_id: z.string().min(1, { error: "Selecione o funcionário." }),
  tipo: z.enum(
    [
      "vale_refeicao",
      "vale_transporte",
      "plano_saude",
      "plano_odontologico",
      "seguro_vida",
      "outro",
    ],
    { error: "Selecione um tipo válido." }
  ),
  valor: z.coerce.number().nonnegative({ error: "Informe um valor válido." }).optional(),
  observacoes: z.string().optional(),
});

export type BeneficioInput = z.infer<typeof BeneficioSchema>;
