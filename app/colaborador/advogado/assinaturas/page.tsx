import { createClient } from "@/lib/supabase/server";
import { getClienteArquivoSignedUrls } from "@/lib/supabase/storage";
import {
  filtrarContasPorPapel,
  getClientesVinculados,
  getContasVinculadas,
  nomeConta,
} from "@/lib/colaborador";
import {
  AssinaturasBoard,
  type DocumentoParaAssinatura,
} from "@/components/colaborador/assinaturas-board";
import type { Documento } from "@/lib/types";

export default async function AdvogadoAssinaturasPage() {
  const contas = filtrarContasPorPapel(await getContasVinculadas(), "advogado");
  const donoIds = contas.map((c) => c.dono_id);
  const contasByDono = new Map(contas.map((c) => [c.dono_id, c]));

  const clientes = await getClientesVinculados(donoIds);
  const clientesById = new Map(clientes.map((c) => [c.id, c]));

  const supabase = await createClient();
  const { data: documentos } = donoIds.length
    ? ((await supabase
        .from("documentos")
        .select("*")
        .in("user_id", donoIds)
        .eq("precisa_assinatura", true)
        .order("created_at", { ascending: false })) as {
        data: Documento[] | null;
      })
    : { data: [] as Documento[] };

  const urls = await getClienteArquivoSignedUrls(
    (documentos ?? []).map((d) => d.arquivo_path)
  );

  const documentosComContexto: DocumentoParaAssinatura[] = (
    documentos ?? []
  ).map((documento) => ({
    ...documento,
    clienteNome: documento.cliente_id
      ? (clientesById.get(documento.cliente_id)?.nome ?? "Cliente removido")
      : "Documento geral",
    donoNome: nomeConta(contasByDono.get(documento.user_id)),
    arquivoUrl: documento.arquivo_path
      ? (urls.get(documento.arquivo_path) ?? null)
      : null,
  }));

  return <AssinaturasBoard documentos={documentosComContexto} />;
}
