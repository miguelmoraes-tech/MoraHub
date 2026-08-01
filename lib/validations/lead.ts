import * as z from "zod";

export const LeadSchema = z.object({
  nome: z.string().min(1, { error: "Informe o nome do lead." }),
  contato: z.string().optional(),
  tem_site: z.boolean(),
  site_link: z.string().optional(),
  tem_insta: z.boolean(),
  insta_link: z.string().optional(),
  descricao: z.string().optional(),
  abordado_por: z.string().optional(),
  nicho: z.string().optional(),
  tipo_contato: z.enum(["whatsapp", "ligacao", "ambos"], {
    error: "Selecione o tipo de contato.",
  }),
  campanha_id: z.string().optional(),
});

export type LeadInput = z.infer<typeof LeadSchema>;

export const LeadResultadoSchema = z.object({
  resultado: z.enum(["sem_resposta", "negou"], {
    error: "Selecione um resultado.",
  }),
  motivo_negou: z.string().optional(),
});

export type LeadResultadoInput = z.infer<typeof LeadResultadoSchema>;

export const LeadPreviaSchema = z.object({
  previa_enviada: z.boolean(),
  data_previa: z.string().optional(),
});

export type LeadPreviaInput = z.infer<typeof LeadPreviaSchema>;

export const FollowupLeadSchema = z.object({
  canal: z.enum(["whatsapp", "ligacao", "email", "presencial", "outro"], {
    error: "Selecione o canal do contato.",
  }),
  resumo: z.string().min(1, { error: "Descreva rapidamente o que foi falado." }),
  proximo_followup: z.string().min(1, { error: "Informe a data do próximo follow-up." }),
});

export type FollowupLeadInput = z.infer<typeof FollowupLeadSchema>;
