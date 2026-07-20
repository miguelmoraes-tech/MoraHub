import * as z from "zod";

export const ClienteSchema = z.object({
  nome: z.string().min(1, { error: "Informe o nome do cliente." }),
  contato: z.string().optional(),
  resumo: z.string().optional(),
  site_link: z.string().optional(),
  status: z.enum(["pendente", "finalizado"], {
    error: "Selecione um status válido.",
  }),
  assinatura_ativa: z.boolean(),
  assinatura_plano: z.string().optional(),
  assinatura_vencimento: z.string().optional(),
  abordado_por: z.string().optional(),
});

export type ClienteInput = z.infer<typeof ClienteSchema>;
