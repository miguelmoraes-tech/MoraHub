import { createClient } from "@/lib/supabase/server";
import { getClienteArquivoSignedUrls } from "@/lib/supabase/storage";
import {
  DocumentosBoard,
  type DocumentoComArquivo,
} from "@/components/documentos-board";
import type { Cliente, Documento, ModeloContrato } from "@/lib/types";

export default async function DocumentosPage() {
  const supabase = await createClient();

  const [{ data: documentos }, { data: clientes }, { data: modelos }] =
    (await Promise.all([
      supabase
        .from("documentos")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("clientes").select("*").order("nome"),
      supabase
        .from("modelos_contrato")
        .select("*")
        .not("conteudo", "is", null)
        .order("titulo"),
    ])) as [
      { data: Documento[] | null },
      { data: Cliente[] | null },
      { data: ModeloContrato[] | null },
    ];

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
    <DocumentosBoard
      documentos={documentosComArquivo}
      clientes={clientes ?? []}
      modelos={modelos ?? []}
    />
  );
}
