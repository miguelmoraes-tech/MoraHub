import { createClient } from "@/lib/supabase/server";

const BUCKET = "arquivos-clientes";
const PESSOAL_BUCKET = "arquivos-pessoais";
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

export async function uploadDocumentoArquivo(userId: string, file: File) {
  const supabase = await createClient();
  const path = `${userId}/documentos/${Date.now()}-${sanitizeFileName(file.name)}`;

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

export function buildPessoalDocumentoPath(
  userId: string,
  documentoId: string,
  fileName: string
) {
  return `${userId}/${documentoId}/${sanitizeFileName(fileName)}`;
}

export async function uploadPessoalDocumentoArquivo(path: string, file: File) {
  const supabase = await createClient();
  const { error } = await supabase.storage
    .from(PESSOAL_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;
}

export async function removePessoalDocumentoArquivo(path: string) {
  const supabase = await createClient();
  await supabase.storage.from(PESSOAL_BUCKET).remove([path]);
}

export async function getPessoalDocumentoSignedUrl(path: string) {
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from(PESSOAL_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  return data?.signedUrl ?? null;
}

export async function getPessoalDocumentoSignedUrls(paths: (string | null)[]) {
  const uniquePaths = [...new Set(paths.filter((p): p is string => !!p))];
  const entries = await Promise.all(
    uniquePaths.map(
      async (path) => [path, await getPessoalDocumentoSignedUrl(path)] as const
    )
  );
  return new Map(entries);
}
