import * as z from "zod";

export const PropriedadeIntelectualSchema = z.object({
  cliente_id: z.string().min(1, { error: "Selecione o cliente." }),
  tipo: z.enum(["Marca", "Patente", "Direito Autoral", "Domínio", "Outro"], {
    error: "Selecione um tipo válido.",
  }),
  nome: z.string().min(1, { error: "Informe o nome." }),
  numero_registro: z.string().optional(),
  orgao: z.string().optional(),
  status: z.enum(["registrado", "em_analise", "pendente", "vencido"], {
    error: "Selecione um status válido.",
  }),
  data_registro: z.string().optional(),
  data_renovacao: z.string().optional(),
  observacoes: z.string().optional(),
});

export type PropriedadeIntelectualInput = z.infer<
  typeof PropriedadeIntelectualSchema
>;
