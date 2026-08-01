import * as z from "zod";

export const BackupSchema = z.object({
  projeto_id: z.string().optional(),
  data: z.string().min(1, { error: "Informe a data." }),
  tipo: z.string().optional(),
  local: z.string().optional(),
  link_ou_arquivo: z.string().optional(),
});

export type BackupInput = z.infer<typeof BackupSchema>;
