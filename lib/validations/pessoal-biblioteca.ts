import * as z from "zod";

export const PessoalBibliotecaSchema = z.object({
  item_type: z.enum(["video", "ebook", "artigo", "link", "outro"], {
    error: "Selecione um tipo válido.",
  }),
  title: z.string().optional(),
  url: z.string().optional(),
  thumbnail_url: z.string().optional(),
  status: z.enum(["para_ver", "vendo", "concluido"]).optional(),
  tags: z.string().optional(),
  notes: z.string().optional(),
  project_id: z.string().optional(),
});

export type PessoalBibliotecaInput = z.infer<typeof PessoalBibliotecaSchema>;
