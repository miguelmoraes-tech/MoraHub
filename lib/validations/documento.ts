import * as z from "zod";

export const SignatarioSchema = z.object({
  nome: z.string().min(1),
  email: z.email(),
  assinado: z.boolean(),
});

export const DocumentoSchema = z.object({
  titulo: z.string().min(1, { error: "Informe o título." }),
  tipo: z.enum(["link", "nota"], { error: "Selecione um tipo válido." }),
  categoria: z
    .enum([
      "Contrato",
      "Proposta",
      "Briefing",
      "Nota fiscal",
      "Arquivo do cliente",
      "Outro",
    ])
    .optional(),
  cliente_id: z.string().optional(),
  conteudo: z.string().optional(),
  data: z.string().optional(),
  precisa_assinatura: z.boolean().default(false),
  status_assinatura: z.enum(["pendente", "assinado", "recusado"]).optional(),
  signatarios: z.array(SignatarioSchema).default([]),
});

export type DocumentoInput = z.infer<typeof DocumentoSchema>;
