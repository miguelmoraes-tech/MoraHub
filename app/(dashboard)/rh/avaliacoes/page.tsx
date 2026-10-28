import { createClient } from "@/lib/supabase/server";
import { getAcessoSoDono } from "@/lib/empresa-ativa";
import { AvaliacoesBoard } from "@/components/rh/avaliacoes-board";
import type { AvaliacaoDesempenho, Funcionario } from "@/lib/types";

export default async function AvaliacoesPage() {
  // RH é só do fundador/cofundador: sócio e funcionário nunca chegam aqui.
  const acesso = await getAcessoSoDono("rh");
  const workspaceId = acesso?.workspaceId ?? null;
  const supabase = await createClient();

  const [{ data: avaliacoes }, { data: funcionarios }] = workspaceId
    ? ((await Promise.all([
        supabase
          .from("avaliacoes_desempenho")
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("periodo_referencia", { ascending: true }),
        supabase
          .from("funcionarios")
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("nome", { ascending: true }),
      ])) as [{ data: AvaliacaoDesempenho[] | null }, { data: Funcionario[] | null }])
    : [{ data: [] as AvaliacaoDesempenho[] }, { data: [] as Funcionario[] }];

  return <AvaliacoesBoard avaliacoes={avaliacoes ?? []} funcionarios={funcionarios ?? []} />;
}
