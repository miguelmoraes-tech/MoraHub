import { createClient } from "@/lib/supabase/server";
import { getPessoalDocumentoSignedUrls } from "@/lib/supabase/storage";
import {
  DocumentosSection,
  type PessoalDocumentoComArquivo,
} from "@/components/pessoal/documentos-section";
import type { PessoalDocument } from "@/lib/pessoal/types";

export default async function PessoalDocumentosPage() {
  const supabase = await createClient();

  const { data: documentos } = (await supabase
    .from("pessoal_documents")
    .select("*")
    .order("created_at", { ascending: false })) as {
    data: PessoalDocument[] | null;
  };

  const urls = await getPessoalDocumentoSignedUrls(
    (documentos ?? []).map((d) => d.storage_path)
  );

  const documentosComArquivo: PessoalDocumentoComArquivo[] = (
    documentos ?? []
  ).map((documento) => ({
    ...documento,
    arquivoUrl: documento.storage_path
      ? (urls.get(documento.storage_path) ?? null)
      : null,
  }));

  return <DocumentosSection documentos={documentosComArquivo} />;
}
