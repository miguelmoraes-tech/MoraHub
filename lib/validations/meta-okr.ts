import * as z from "zod";

const SETOR_VALUES = [
  "geral",
  "financeiro",
  "comercial",
  "marketing",
  "rh",
  "juridico",
  "contabil",
  "tecnico",
] as const;

const STATUS_VALUES = [
  "nao_iniciado",
  "em_andamento",
  "concluido",
  "atrasado",
  "cancelado",
] as const;

export const ObjetivoSchema = z.object({
  titulo: z.string().min(1, { error: "Informe o título do objetivo." }),
  descricao: z.string().optional(),
  setor: z.enum(SETOR_VALUES, { error: "Selecione o setor." }),
  periodo_inicio: z.string().optional(),
  periodo_fim: z.string().optional(),
  status: z.enum(STATUS_VALUES, { error: "Selecione o status." }),
});

export type ObjetivoInput = z.infer<typeof ObjetivoSchema>;

export const ResultadoChaveSchema = z.object({
  titulo: z.string().min(1, { error: "Informe o título do resultado-chave." }),
  valor_meta: z.coerce
    .number({ error: "Informe um valor meta válido." })
    .positive({ error: "O valor meta deve ser maior que zero." }),
  valor_atual: z.coerce
    .number({ error: "Informe um valor atual válido." })
    .min(0, { error: "O valor atual deve ser positivo." })
    .optional(),
  unidade: z.enum(["numero", "reais", "percentual", "clientes", "outro"], {
    error: "Selecione a unidade.",
  }),
  responsavel_id: z.string().optional(),
  status: z.enum(STATUS_VALUES, { error: "Selecione o status." }),
});

export type ResultadoChaveInput = z.infer<typeof ResultadoChaveSchema>;
