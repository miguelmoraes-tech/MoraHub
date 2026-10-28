import { createClient } from "@/lib/supabase/server";

const BUCKET = "arquivos-clientes";
const PESSOAL_BUCKET = "arquivos-pessoais";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-]+/g, "_");
}

/**
 * Arquivos NOVOS ficam na pasta da empresa (`<workspace_id>/...`): a policy do
 * bucket libera fundador/cofundador e a equipe com Jurídico/Financeiro. O
 * caminho antigo `<user_id>/...` continua valendo para leitura e remoção.
 */
export async function uploadClienteArquivo(
  workspaceId: string,
  clienteId: string,
  file: File
) {
  const supabase = await createClient();
  const path = `${workspaceId}/${clienteId}/${Date.now()}-${sanitizeFileName(file.name)}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file);
  if (error) throw error;

  return path;
}

export async function uploadDocumentoArquivo(workspaceId: string, file: File) {
  const supabase = await createClient();
  const path = `${workspaceId}/documentos/${Date.now()}-${sanitizeFileName(file.name)}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file);
  if (error) throw error;

  return path;
}

/** Modelos de contrato novos ficam na pasta da empresa (`<workspace_id>/modelos/...`). */
export async function uploadModeloContratoArquivo(workspaceId: string, file: File) {
  const supabase = await createClient();
  const path = `${workspaceId}/modelos/${Date.now()}-${sanitizeFileName(file.name)}`;

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

/** Currículos novos ficam na pasta da empresa (`<workspace_id>/rh/candidatos/...`). */
export async function uploadCandidatoCurriculo(workspaceId: string, file: File) {
  const supabase = await createClient();
  const path = `${workspaceId}/rh/candidatos/${Date.now()}-${sanitizeFileName(file.name)}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file);
  if (error) throw error;

  return path;
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
