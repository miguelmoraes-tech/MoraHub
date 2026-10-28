import { notFound } from "next/navigation";
import { getAcessoSoDono } from "@/lib/empresa-ativa";
import { createClient } from "@/lib/supabase/server";
import { getClienteArquivoSignedUrls } from "@/lib/supabase/storage";
import { CandidatosKanban } from "@/components/rh/candidatos-kanban";
import type { Candidato, Vaga } from "@/lib/types";

export default async function VagaCandidatosPage({
  params,
}: {
  params: Promise<{ vagaId: string }>;
}) {
  const { vagaId } = await params;
  const acesso = await getAcessoSoDono("rh");
  if (!acesso) notFound();

  const supabase = await createClient();
  const { data: vaga } = (await supabase
    .from("vagas")
    .select("*")
    .eq("id", vagaId)
    .eq("workspace_id", acesso.workspaceId)
    .single()) as { data: Vaga | null };
  if (!vaga) notFound();

  const { data: candidatos } = (await supabase
    .from("candidatos")
    .select("*")
    .eq("vaga_id", vagaId)
    .eq("workspace_id", acesso.workspaceId)
    .order("created_at", { ascending: true })) as { data: Candidato[] | null };

  const curriculoUrls = await getClienteArquivoSignedUrls(
    (candidatos ?? []).map((c) => c.curriculo_path)
  );

  return (
    <CandidatosKanban
      vaga={vaga}
      candidatos={candidatos ?? []}
      curriculoUrls={Object.fromEntries(curriculoUrls)}
    />
  );
}
