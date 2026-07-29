import { createClient } from "@/lib/supabase/server";
import { getClienteArquivoSignedUrls } from "@/lib/supabase/storage";
import {
  DocumentosBoard,
  type DocumentoComArquivo,
} from "@/components/documentos-board";
import type { Cliente, Documento } from "@/lib/types";

export default async function DocumentosPage() {
  const supabase = await createClient();

  const [{ data: documentos }, { data: clientes }] = (await Promise.all([
    supabase
      .from("documentos")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("clientes").select("*").order("nome"),
  ])) as [{ data: Documento[] | null }, { data: Cliente[] | null }];

  const urls = await getClienteArquivoSignedUrls(
    (documentos ?? []).map((d) => d.arquivo_path)
  );

  const documentosComArquivo: DocumentoComArquivo[] = (documentos ?? []).map(
    (documento) => ({
      ...documento,
      arquivoUrl: documento.arquivo_path
        ? (urls.get(documento.arquivo_path) ?? null)
        : null,
    })
  );

  return (
    <DocumentosBoard documentos={documentosComArquivo} clientes={clientes ?? []} />
  );
}
