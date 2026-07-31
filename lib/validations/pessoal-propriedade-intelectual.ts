import * as z from "zod";

export const PessoalPropriedadeIntelectualSchema = z.object({
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

export type PessoalPropriedadeIntelectualInput = z.infer<
  typeof PessoalPropriedadeIntelectualSchema
>;
