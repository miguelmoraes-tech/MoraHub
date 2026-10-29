import { createClient } from "@/lib/supabase/server";
import { BUCKET_P3D } from "@/lib/impressao-3d/storage-constantes";

/**
 * Arquivos do catálogo (STL, 3MF, GCODE, fotos): bucket PRIVADO "p3d-arquivos",
 * caminho obrigatório "<workspace_id>/<produto_id>/<uuid>-<nome>", limite de
 * 100 MB. Só se visualiza/baixa por signed URL de curta duração.
 */
export const LIMITE_ARQUIVO_BYTES = 100 * 1024 * 1024;
const TTL_SEGUNDOS = 60 * 10;

export async function assinarArquivo(path: string, baixarComo?: string): Promise<string | null> {
  const { data } = await (await createClient()).storage
    .from(BUCKET_P3D)
    .createSignedUrl(path, TTL_SEGUNDOS, baixarComo ? { download: baixarComo } : undefined);
  return data?.signedUrl ?? null;
}

/** Várias URLs de uma vez (previews de fotos): caminho → URL assinada. */
export async function assinarArquivos(paths: string[]): Promise<Map<string, string>> {
  const mapa = new Map<string, string>();
  if (paths.length === 0) return mapa;
  const { data } = await (await createClient()).storage.from(BUCKET_P3D).createSignedUrls(paths, TTL_SEGUNDOS);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) mapa.set(item.path, item.signedUrl);
  }
  return mapa;
}

export async function removerObjetos(paths: string[]): Promise<{ error: string | null }> {
  if (paths.length === 0) return { error: null };
  const { error } = await (await createClient()).storage.from(BUCKET_P3D).remove(paths);
  return { error: error ? error.message : null };
}
