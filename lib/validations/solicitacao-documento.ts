import * as z from "zod";

export const SolicitacaoDocumentoSchema = z.object({
  cliente_id: z.string().min(1, { error: "Selecione o cliente." }),
  titulo: z.string().min(1, { error: "Informe o título." }),
  descricao: z.string().optional(),
});

export type SolicitacaoDocumentoInput = z.infer<
  typeof SolicitacaoDocumentoSchema
>;
