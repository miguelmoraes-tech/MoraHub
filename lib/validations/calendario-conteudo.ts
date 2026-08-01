import * as z from "zod";

export const CalendarioConteudoSchema = z.object({
  titulo: z.string().min(1, { error: "Informe o título." }),
  tipo: z.enum(["post", "video", "artigo", "email", "stories", "outro"], {
    error: "Selecione o tipo de conteúdo.",
  }),
  canal: z.enum(
    ["instagram", "facebook", "linkedin", "tiktok", "youtube", "blog", "email", "outro"],
    { error: "Selecione o canal." }
  ),
  data_publicacao: z.string().optional(),
  status: z.enum(["planejado", "em_producao", "agendado", "publicado", "cancelado"], {
    error: "Selecione o status.",
  }),
  conteudo: z.string().optional(),
  link_publicado: z.string().optional(),
  responsavel_id: z.string().optional(),
  observacoes: z.string().optional(),
});

export type CalendarioConteudoInput = z.infer<typeof CalendarioConteudoSchema>;
