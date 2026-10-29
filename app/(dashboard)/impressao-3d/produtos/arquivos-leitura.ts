"use server";

import { getAcessoModulo } from "@/lib/empresa-ativa";
import { createClient } from "@/lib/supabase/server";
import { assinarArquivo } from "@/lib/impressao-3d/storage";

export type ResultadoUrl = { url: string } | { error: string };

/**
 * URL assinada (curta duração) para baixar um arquivo do catálogo. Leitura:
 * confere o acesso ao módulo e que a linha é da empresa ativa antes de assinar.
 */
export async function urlDownloadArquivo(arquivoId: string): Promise<ResultadoUrl> {
  const acesso = await getAcessoModulo("p3d_produtos");
  if (!acesso) return { error: "Você não tem permissão para fazer isso." };

  const { data: arquivo } = await (await createClient())
    .from("p3d_produto_arquivos")
    .select("storage_path, nome")
    .eq("id", arquivoId)
    .eq("workspace_id", acesso.workspaceId)
    .maybeSingle();
  if (!arquivo) return { error: "Arquivo não encontrado." };

  const url = await assinarArquivo(arquivo.storage_path as string, arquivo.nome as string);
  return url ? { url } : { error: "Não foi possível gerar o link de download." };
}
