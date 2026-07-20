import { createClient } from "@/lib/supabase/server";

const BUCKET = "arquivos-clientes";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-]+/g, "_");
}

export async function uploadClienteArquivo(
  userId: string,
  clienteId: string,
  file: File
) {
  const supabase = await createClient();
  const path = `${userId}/${clienteId}/${Date.now()}-${sanitizeFileName(file.name)}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file);
  if (error) throw error;

  return path;
}

export async function removeClienteArquivo(path: string) {
  const supabase = await createClient();
  await supabase.storage.from(BUCKET).remove([path]);
}

export async function getClienteArquivoSignedUrl(path: string) {
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  return data?.signedUrl ?? null;
}

export async function getClienteArquivoSignedUrls(paths: (string | null)[]) {
  const uniquePaths = [...new Set(paths.filter((p): p is string => !!p))];
  const entries = await Promise.all(
    uniquePaths.map(async (path) => [path, await getClienteArquivoSignedUrl(path)] as const)
  );
  return new Map(entries);
}
