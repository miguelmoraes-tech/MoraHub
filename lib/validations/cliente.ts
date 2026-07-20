import * as z from "zod";

export const ClienteSchema = z.object({
  nome: z.string().min(1, { error: "Informe o nome do cliente." }),
  telefone: z.string().optional(),
  email: z.email({ error: "Informe um e-mail válido." }).optional(),
  resumo: z.string().optional(),
  site_link: z.string().optional(),
  status: z.enum(["ativo", "em_andamento", "pausado", "encerrado"], {
    error: "Selecione um status válido.",
  }),
  segmento: z.string().optional(),
  abordado_por: z.string().optional(),
});

export type ClienteInput = z.infer<typeof ClienteSchema>;
