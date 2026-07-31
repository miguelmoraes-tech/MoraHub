import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveDonoIdForRH } from "@/lib/rh";
import { getClienteArquivoSignedUrls } from "@/lib/supabase/storage";
import { CandidatosKanban } from "@/components/rh/candidatos-kanban";
import type { Candidato, Vaga } from "@/lib/types";

export default async function VagaCandidatosPage({
  params,
}: {
  params: Promise<{ vagaId: string }>;
}) {
  const { vagaId } = await params;
  const donoId = await getEffectiveDonoIdForRH();
  if (!donoId) notFound();

  const supabase = await createClient();
  const { data: vaga } = (await supabase
    .from("vagas")
    .select("*")
    .eq("id", vagaId)
    .single()) as { data: Vaga | null };
  if (!vaga) notFound();

  const { data: candidatos } = (await supabase
    .from("candidatos")
    .select("*")
    .eq("vaga_id", vagaId)
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
