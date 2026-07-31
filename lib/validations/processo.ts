import * as z from "zod";

export const ProcessoSchema = z.object({
  cliente_id: z.string().min(1, { error: "Selecione o cliente." }),
  numero_processo: z.string().optional(),
  tribunal_orgao: z.string().optional(),
  parte_contraria: z.string().optional(),
  tipo_acao: z.string().optional(),
  fase: z.enum(["inicial", "instrucao", "recursal", "execucao", "encerrado"], {
    error: "Selecione uma fase válida.",
  }),
  proximo_prazo: z.string().optional(),
  descricao_prazo: z.string().optional(),
  observacoes: z.string().optional(),
});

export type ProcessoInput = z.infer<typeof ProcessoSchema>;
