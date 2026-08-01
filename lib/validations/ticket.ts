import * as z from "zod";

export const TicketSchema = z.object({
  cliente_id: z.string().min(1, { error: "Selecione o cliente." }),
  titulo: z.string().min(1, { error: "Informe o título." }),
  descricao: z.string().optional(),
  categoria: z.enum(
    ["tecnico", "financeiro", "juridico", "contabil", "geral", "outro"],
    { error: "Selecione a categoria." }
  ),
  prioridade: z.enum(["baixa", "media", "alta", "urgente"], {
    error: "Selecione a prioridade.",
  }),
  responsavel_id: z.string().optional(),
  sla_horas: z.coerce
    .number({ error: "Informe o SLA em horas." })
    .int()
    .min(1, { error: "O SLA deve ser de pelo menos 1 hora." }),
});

export type TicketInput = z.infer<typeof TicketSchema>;

export const TicketRespostaSchema = z.object({
  conteudo: z.string().min(1, { error: "Escreva uma resposta." }),
  interna: z.boolean(),
});

export type TicketRespostaInput = z.infer<typeof TicketRespostaSchema>;

export const TICKET_STATUS_VALUES = [
  "aberto",
  "em_andamento",
  "aguardando_cliente",
  "resolvido",
  "fechado",
] as const;
