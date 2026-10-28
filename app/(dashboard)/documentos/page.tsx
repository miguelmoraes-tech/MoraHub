import { createClient } from "@/lib/supabase/server";
import { getAcessoJuridico } from "@/lib/juridico-acesso";
import { getClienteArquivoSignedUrls } from "@/lib/supabase/storage";
import {
  DocumentosBoard,
  type DocumentoComArquivo,
} from "@/components/documentos-board";
import { SemAcessoAviso } from "@/components/financeiro/sem-valores";
import type { Cliente, Documento, ModeloContrato } from "@/lib/types";

export default async function DocumentosPage() {
  const jur = await getAcessoJuridico();
  if (!jur) return <SemAcessoAviso titulo="Documentos" />;
  const supabase = await createClient();

  const [{ data: documentos }, { data: clientes }, { data: modelos }] =
    (await Promise.all([
      supabase
        .from("documentos")
        .select("*")
        .eq("workspace_id", jur.workspaceId)
        .order("created_at", { ascending: false }),
      // Clientes: leitura auxiliar, só com permissão no módulo ("—" sem ela).
      jur.clientes
        ? supabase
            .from("clientes")
            .select("*")
            .eq("workspace_id", jur.clientes.workspaceId)
            .order("nome")
        : Promise.resolve({ data: [] }),
      supabase
        .from("modelos_contrato")
        .select("*")
        .eq("workspace_id", jur.workspaceId)
        .not("conteudo", "is", null)
        .order("titulo"),
    ])) as [
      { data: Documento[] | null },
      { data: Cliente[] | null },
      { data: ModeloContrato[] | null },
    ];

  // Arquivos antigos (<user_id>/...) e novos (<workspace_id>/...) abrem do mesmo jeito.
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
      somenteLeitura={jur.somenteLeitura}
      clientesIndisponiveis={!jur.clientes}
      semLinkCliente={!jur.acesso.ehDono}
    />
  );
}
