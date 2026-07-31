import { createClient } from "@/lib/supabase/server";
import { getClienteArquivoSignedUrls } from "@/lib/supabase/storage";
import {
  filtrarContasPorPapel,
  getContasVinculadas,
} from "@/lib/colaborador";
import { ModelosContratoBoard } from "@/components/colaborador/modelos-contrato-board";
import type { ModeloContrato } from "@/lib/types";

export default async function AdvogadoModelosContratoPage() {
  const contas = filtrarContasPorPapel(await getContasVinculadas(), "advogado");
  const donoIds = contas.map((c) => c.dono_id);

  const supabase = await createClient();
  const { data: modelos } = donoIds.length
    ? ((await supabase
        .from("modelos_contrato")
        .select("*")
        .in("user_id", donoIds)
        .order("titulo")) as { data: ModeloContrato[] | null })
    : { data: [] as ModeloContrato[] };

  const urls = await getClienteArquivoSignedUrls(
    (modelos ?? []).map((m) => m.arquivo_path)
  );
  const modelosComArquivo = (modelos ?? []).map((modelo) => ({
    ...modelo,
    arquivoUrl: modelo.arquivo_path ? (urls.get(modelo.arquivo_path) ?? null) : null,
  }));

  return <ModelosContratoBoard modelos={modelosComArquivo} contas={contas} />;
}
