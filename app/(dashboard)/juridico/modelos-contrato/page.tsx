import { createClient } from "@/lib/supabase/server";
import { getAcessoJuridico } from "@/lib/juridico-acesso";
import { getClienteArquivoSignedUrls } from "@/lib/supabase/storage";
import { ModelosContratoBoard } from "@/components/juridico/modelos-contrato-board";
import { SemAcessoAviso } from "@/components/financeiro/sem-valores";
import type { ModeloContrato } from "@/lib/types";

export default async function JuridicoModelosContratoPage() {
  const jur = await getAcessoJuridico();
  if (!jur) return <SemAcessoAviso titulo="Modelos de Contrato" />;
  const supabase = await createClient();

  const { data: modelos } = (await supabase
    .from("modelos_contrato")
    .select("*")
    .eq("workspace_id", jur.workspaceId)
    .order("titulo")) as { data: ModeloContrato[] | null };

  // Leitura antiga (<user_id>/...) e nova (<workspace_id>/...) usam a mesma URL assinada.
  const urls = await getClienteArquivoSignedUrls((modelos ?? []).map((m) => m.arquivo_path));
  const modelosComArquivo = (modelos ?? []).map((modelo) => ({
    ...modelo,
    arquivoUrl: modelo.arquivo_path ? (urls.get(modelo.arquivo_path) ?? null) : null,
  }));

  return <ModelosContratoBoard modelos={modelosComArquivo} somenteLeitura={jur.somenteLeitura} />;
}
