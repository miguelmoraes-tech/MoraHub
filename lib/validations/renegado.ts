import * as z from "zod";

export const RenegadoSchema = z.object({
  nome: z.string().min(1, { error: "Informe o nome do renegado." }),
  contato: z.string().optional(),
  tem_site: z.boolean(),
  site_link: z.string().optional(),
  tem_insta: z.boolean(),
  insta_link: z.string().optional(),
  descricao: z.string().optional(),
  abordado_por: z.string().min(1, { error: "Informe quem abordou." }),
  motivo_negou: z.string().optional(),
  data_abordagem: z.string().optional(),
});

export type RenegadoInput = z.infer<typeof RenegadoSchema>;
