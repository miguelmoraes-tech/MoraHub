import * as z from "zod";

export const AcessoSchema = z.object({
  nome_servico: z.string().min(1, { error: "Informe o nome do serviço." }),
  categoria: z
    .enum(
      [
        "Hospedagem",
        "Domínio",
        "Google",
        "Meta",
        "Cloudflare",
        "GitHub",
        "WordPress",
        "VPS",
        "Shopify",
        "Outro",
      ],
      { error: "Selecione uma categoria válida." }
    )
    .optional(),
  url_login: z.string().optional(),
  usuario: z.string().optional(),
  email: z.email({ error: "Informe um e-mail válido." }).optional(),
  observacoes: z.string().optional(),
  referencia_senha: z.string().optional(),
});

export type AcessoInput = z.infer<typeof AcessoSchema>;
